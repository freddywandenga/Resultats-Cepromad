const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

module.exports = function (db) {
  const router = express.Router();

  function listePromotions(anneeId) {
    return db.prepare(`
      SELECT p.*, f.nom AS faculte_nom FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(anneeId);
  }

  // --- SAISIE MANUELLE (par promotion / cours / session) ---
  router.get('/saisie', (req, res) => {
    const promotions = listePromotions(req.anneeActive.id);
    const { promotion_id, cours_id, session } = req.query;
    const sess = session || 'principale';
    let cours = [];
    let etudiants = [];
    if (promotion_id) cours = db.prepare('SELECT * FROM cours WHERE promotion_id = ? ORDER BY nom').all(promotion_id);
    if (promotion_id && cours_id) {
      etudiants = db.prepare(`
        SELECT e.id, e.matricule, e.nom, e.postnom, e.prenom, r.note, r.note_max
        FROM etudiants e
        JOIN inscriptions i ON i.etudiant_id = e.id AND i.promotion_id = ? AND i.statut = 'active'
        LEFT JOIN resultats r ON r.etudiant_id = e.id AND r.cours_id = ? AND r.session = ? AND r.annee_academique_id = ?
        ORDER BY e.nom, e.postnom
      `).all(promotion_id, cours_id, sess, req.anneeActive.id);
    }
    res.render('resultats/saisie', { promotions, cours, etudiants, promotion_id, cours_id, session: sess });
  });

  router.post('/saisie', (req, res) => {
    const { promotion_id, cours_id, session, etudiant_ids, valeurs, note_max } = req.body;
    const ids = Array.isArray(etudiant_ids) ? etudiant_ids : [etudiant_ids].filter(Boolean);
    const vals = Array.isArray(valeurs) ? valeurs : [valeurs];
    const upsert = db.prepare(`
      INSERT INTO resultats (etudiant_id, cours_id, promotion_id, annee_academique_id, note, note_max, session)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(etudiant_id, cours_id, session, annee_academique_id) DO UPDATE SET note = excluded.note, note_max = excluded.note_max
    `);
    ids.forEach((eid, idx) => {
      const note = vals[idx];
      if (note !== '' && note !== undefined && note !== null) {
        upsert.run(eid, cours_id, promotion_id, req.anneeActive.id, parseFloat(note), parseFloat(note_max) || 20, session);
      }
    });
    res.redirect(`/admin/resultats/saisie?promotion_id=${promotion_id}&cours_id=${cours_id}&session=${session}`);
  });

  // --- IMPORT EXCEL ---
  router.get('/import', (req, res) => {
    const promotions = listePromotions(req.anneeActive.id);
    const promoIds = promotions.map(p => p.id);
    let coursTous = [];
    if (promoIds.length > 0) {
      const placeholders = promoIds.map(() => '?').join(',');
      coursTous = db.prepare(`SELECT id, nom, credits, promotion_id FROM cours WHERE promotion_id IN (${placeholders}) ORDER BY nom`).all(...promoIds);
    }
    res.render('resultats/import', { promotions, coursTous, rapport: null });
  });

  router.post('/import', upload.single('fichier'), (req, res) => {
    const promotions = listePromotions(req.anneeActive.id);
    const promoIds = promotions.map(p => p.id);
    let coursTous = [];
    if (promoIds.length > 0) {
      const placeholders = promoIds.map(() => '?').join(',');
      coursTous = db.prepare(`SELECT id, nom, credits, promotion_id FROM cours WHERE promotion_id IN (${placeholders}) ORDER BY nom`).all(...promoIds);
    }
    const { promotion_id, cours_id, session } = req.body;
    if (!req.file) {
      return res.render('resultats/import', { promotions, coursTous, rapport: { erreur: 'Aucun fichier reçu.' } });
    }
    try {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const lignes = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const trouverEtudiant = db.prepare('SELECT id FROM etudiants WHERE matricule = ?');
      const upsert = db.prepare(`
        INSERT INTO resultats (etudiant_id, cours_id, promotion_id, annee_academique_id, note, note_max, session)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(etudiant_id, cours_id, session, annee_academique_id) DO UPDATE SET note = excluded.note, note_max = excluded.note_max
      `);

      let importes = 0;
      const erreurs = [];
      lignes.forEach((ligne, idx) => {
        const matricule = String(ligne.matricule || ligne.Matricule || '').trim();
        const note = parseFloat(ligne.note ?? ligne.Note);
        const noteMax = parseFloat(ligne.note_max ?? ligne['Note max'] ?? 20) || 20;
        if (!matricule || isNaN(note)) {
          erreurs.push(`Ligne ${idx + 2} : matricule ou note manquant/invalide.`);
          return;
        }
        const etu = trouverEtudiant.get(matricule);
        if (!etu) {
          erreurs.push(`Ligne ${idx + 2} : matricule "${matricule}" introuvable.`);
          return;
        }
        upsert.run(etu.id, cours_id, promotion_id, req.anneeActive.id, note, noteMax, session || 'principale');
        importes++;
      });

      res.render('resultats/import', { promotions, coursTous, rapport: { importes, erreurs, total: lignes.length } });
    } catch (e) {
      res.render('resultats/import', { promotions, coursTous, rapport: { erreur: "Fichier illisible. Vérifiez qu'il s'agit bien d'un .xlsx/.csv avec les colonnes matricule et note." } });
    }
  });

  // --- PUBLICATION DES RESULTATS ---
  router.get('/publication', (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom,
        (SELECT publie FROM publications pub WHERE pub.promotion_id=p.id AND pub.annee_academique_id=p.annee_academique_id AND pub.session='principale') AS publie_principale,
        (SELECT publie FROM publications pub WHERE pub.promotion_id=p.id AND pub.annee_academique_id=p.annee_academique_id AND pub.session='rattrapage') AS publie_rattrapage
      FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);
    res.render('resultats/publication', { promotions });
  });

  router.post('/publication/:promotion_id/:session/basculer', (req, res) => {
    const { promotion_id, session } = req.params;
    const existant = db.prepare(`
      SELECT * FROM publications WHERE promotion_id = ? AND annee_academique_id = ? AND session = ?
    `).get(promotion_id, req.anneeActive.id, session);
    if (existant) {
      db.prepare('UPDATE publications SET publie = ?, date_publication = ? WHERE id = ?')
        .run(existant.publie ? 0 : 1, existant.publie ? null : new Date().toISOString(), existant.id);
    } else {
      db.prepare(`
        INSERT INTO publications (promotion_id, annee_academique_id, session, publie, date_publication)
        VALUES (?, ?, ?, 1, ?)
      `).run(promotion_id, req.anneeActive.id, session, new Date().toISOString());
    }
    res.redirect('/admin/resultats/publication');
  });

  return router;
};
