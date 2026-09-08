const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  function normaliser(s) {
    return (s || '').toString().trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // enlève les accents
  }

  router.get('/', (req, res) => {
    res.render('public/recherche', { erreur: null });
  });

  router.post('/', (req, res) => {
    const { matricule, nom } = req.body;
    const etudiant = db.prepare('SELECT * FROM etudiants WHERE matricule = ?').get((matricule || '').trim());

    if (!etudiant || normaliser(etudiant.nom) !== normaliser(nom)) {
      return res.render('public/recherche', { erreur: "Aucun étudiant ne correspond à ce matricule et à ce nom. Vérifiez votre saisie." });
    }

    const anneeActive = db.prepare('SELECT * FROM annees_academiques WHERE active = 1').get()
      || db.prepare('SELECT * FROM annees_academiques ORDER BY id DESC LIMIT 1').get();

    const inscription = db.prepare(`
      SELECT i.*, p.nom AS promotion_nom, f.nom AS faculte_nom FROM inscriptions i
      JOIN promotions p ON p.id = i.promotion_id JOIN facultes f ON f.id = p.faculte_id
      WHERE i.etudiant_id = ? AND i.annee_academique_id = ? AND i.statut = 'active'
    `).get(etudiant.id, anneeActive.id);

    if (!inscription) {
      return res.render('public/recherche', { erreur: "Aucune inscription trouvée pour cet étudiant pour l'année académique en cours." });
    }

    res.redirect(`/releve/${etudiant.id}?nom=${encodeURIComponent(nom)}`);
  });

  // Relevé de notes (accès direct nécessite d'avoir passé la vérification — on revalide via le nom en query)
  router.get('/releve/:etudiant_id', (req, res) => {
    const etudiant = db.prepare('SELECT * FROM etudiants WHERE id = ?').get(req.params.etudiant_id);
    if (!etudiant || normaliser(etudiant.nom) !== normaliser(req.query.nom)) {
      return res.render('public/recherche', { erreur: 'Session expirée, veuillez refaire votre recherche.' });
    }

    const anneeActive = db.prepare('SELECT * FROM annees_academiques WHERE active = 1').get()
      || db.prepare('SELECT * FROM annees_academiques ORDER BY id DESC LIMIT 1').get();

    const inscription = db.prepare(`
      SELECT i.*, p.nom AS promotion_nom, f.nom AS faculte_nom FROM inscriptions i
      JOIN promotions p ON p.id = i.promotion_id JOIN facultes f ON f.id = p.faculte_id
      WHERE i.etudiant_id = ? AND i.annee_academique_id = ? AND i.statut = 'active'
    `).get(etudiant.id, anneeActive.id);

    if (!inscription) return res.render('public/recherche', { erreur: 'Aucune inscription trouvée.' });

    const sessions = ['principale', 'rattrapage'];
    const blocs = [];
    sessions.forEach(session => {
      const pub = db.prepare(`
        SELECT * FROM publications WHERE promotion_id = ? AND annee_academique_id = ? AND session = ? AND publie = 1
      `).get(inscription.promotion_id, anneeActive.id, session);
      if (!pub) return;

      const resultats = db.prepare(`
        SELECT r.*, c.nom AS cours_nom, c.credits FROM resultats r JOIN cours c ON c.id = r.cours_id
        WHERE r.etudiant_id = ? AND r.promotion_id = ? AND r.annee_academique_id = ? AND r.session = ?
        ORDER BY c.nom
      `).all(etudiant.id, inscription.promotion_id, anneeActive.id, session);

      const totalCredits = db.prepare('SELECT COALESCE(SUM(credits),0) AS s FROM cours WHERE promotion_id = ?').get(inscription.promotion_id).s;
      let pond = 0, creditsObtenus = 0;
      resultats.forEach(r => {
        const noteSur20 = (r.note / r.note_max) * 20;
        pond += noteSur20 * r.credits;
        if (noteSur20 >= 10) creditsObtenus += r.credits;
      });
      const moyenne = resultats.length > 0 ? (pond / resultats.reduce((s, r) => s + r.credits, 0)).toFixed(2) : null;
      const decision = moyenne !== null && parseFloat(moyenne) >= 10 && resultats.length >= (db.prepare('SELECT COUNT(*) AS c FROM cours WHERE promotion_id=?').get(inscription.promotion_id).c)
        ? 'RÉUSSI(E)' : (moyenne !== null ? 'AJOURNÉ(E)' : null);

      blocs.push({ session, resultats, moyenne, decision, totalCredits, creditsObtenus, datePublication: pub.date_publication });
    });

    res.render('public/releve', { etudiant, inscription, anneeActive, blocs });
  });

  return router;
};
