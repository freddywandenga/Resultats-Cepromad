const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  function genererMatricule() {
    const annee = new Date().getFullYear();
    const c = db.prepare('SELECT COUNT(*) AS c FROM etudiants').get().c + 1;
    return `CEP-${annee}-${String(c).padStart(4, '0')}`;
  }

  router.get('/', (req, res) => {
    const q = (req.query.q || '').trim();
    const promotionId = req.query.promotion_id || '';
    let sql = `
      SELECT e.*, p.nom AS promotion_nom, f.nom AS faculte_nom, i.id AS inscription_id
      FROM etudiants e
      LEFT JOIN inscriptions i ON i.etudiant_id = e.id AND i.annee_academique_id = ? AND i.statut = 'active'
      LEFT JOIN promotions p ON p.id = i.promotion_id
      LEFT JOIN facultes f ON f.id = p.faculte_id
      WHERE 1=1
    `;
    const params = [req.anneeActive.id];
    if (q) {
      sql += ` AND (e.nom LIKE ? OR e.postnom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (promotionId) {
      sql += ` AND i.promotion_id = ?`;
      params.push(promotionId);
    }
    sql += ` ORDER BY e.nom, e.postnom`;
    const etudiants = db.prepare(sql).all(...params);
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);
    res.render('etudiants/liste', { etudiants, promotions, q, promotionId });
  });

  router.get('/nouveau', (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);
    res.render('etudiants/formulaire', { etudiant: {}, promotions, promotionSelectionnee: null });
  });

  router.post('/', (req, res) => {
    const b = req.body;
    const matricule = b.matricule && b.matricule.trim() ? b.matricule.trim() : genererMatricule();
    const info = db.prepare(`
      INSERT INTO etudiants (matricule, nom, postnom, prenom, sexe) VALUES (?, ?, ?, ?, ?)
    `).run(matricule, b.nom, b.postnom, b.prenom, b.sexe);

    if (b.promotion_id) {
      db.prepare(`
        INSERT INTO inscriptions (etudiant_id, promotion_id, annee_academique_id) VALUES (?, ?, ?)
      `).run(info.lastInsertRowid, b.promotion_id, req.anneeActive.id);
    }
    res.redirect('/admin/etudiants');
  });

  router.get('/:id', (req, res) => {
    const etudiant = db.prepare('SELECT * FROM etudiants WHERE id = ?').get(req.params.id);
    if (!etudiant) return res.status(404).send('Étudiant introuvable');
    const inscription = db.prepare(`
      SELECT i.*, p.nom AS promotion_nom, f.nom AS faculte_nom FROM inscriptions i
      JOIN promotions p ON p.id = i.promotion_id JOIN facultes f ON f.id = p.faculte_id
      WHERE i.etudiant_id = ? AND i.annee_academique_id = ? AND i.statut = 'active'
    `).get(etudiant.id, req.anneeActive.id);
    const resultats = db.prepare(`
      SELECT r.*, c.nom AS cours_nom, c.credits FROM resultats r JOIN cours c ON c.id = r.cours_id
      WHERE r.etudiant_id = ? AND r.annee_academique_id = ? ORDER BY c.nom
    `).all(etudiant.id, req.anneeActive.id);
    res.render('etudiants/detail', { etudiant, inscription, resultats });
  });

  router.get('/:id/modifier', (req, res) => {
    const etudiant = db.prepare('SELECT * FROM etudiants WHERE id = ?').get(req.params.id);
    if (!etudiant) return res.status(404).send('Étudiant introuvable');
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);
    const inscription = db.prepare(`
      SELECT * FROM inscriptions WHERE etudiant_id = ? AND annee_academique_id = ? AND statut = 'active'
    `).get(etudiant.id, req.anneeActive.id);
    res.render('etudiants/formulaire', { etudiant, promotions, promotionSelectionnee: inscription ? inscription.promotion_id : null });
  });

  router.put('/:id', (req, res) => {
    const b = req.body;
    db.prepare(`
      UPDATE etudiants SET nom=?, postnom=?, prenom=?, sexe=? WHERE id=?
    `).run(b.nom, b.postnom, b.prenom, b.sexe, req.params.id);

    const inscriptionExistante = db.prepare(`
      SELECT * FROM inscriptions WHERE etudiant_id = ? AND annee_academique_id = ? AND statut = 'active'
    `).get(req.params.id, req.anneeActive.id);

    if (b.promotion_id) {
      if (inscriptionExistante) {
        db.prepare('UPDATE inscriptions SET promotion_id = ? WHERE id = ?').run(b.promotion_id, inscriptionExistante.id);
      } else {
        db.prepare('INSERT INTO inscriptions (etudiant_id, promotion_id, annee_academique_id) VALUES (?, ?, ?)')
          .run(req.params.id, b.promotion_id, req.anneeActive.id);
      }
    }
    res.redirect('/admin/etudiants/' + req.params.id);
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM etudiants WHERE id = ?').run(req.params.id);
    res.redirect('/admin/etudiants');
  });

  return router;
};
