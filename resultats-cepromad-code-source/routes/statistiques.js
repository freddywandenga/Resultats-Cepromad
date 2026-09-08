const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  function calculerStats(promotionId, anneeId, session) {
    const inscrits = db.prepare(`
      SELECT e.id FROM etudiants e
      JOIN inscriptions i ON i.etudiant_id = e.id AND i.promotion_id = ? AND i.statut = 'active'
    `).all(promotionId);
    const cours = db.prepare('SELECT * FROM cours WHERE promotion_id = ?').all(promotionId);
    const totalCredits = cours.reduce((s, c) => s + c.credits, 0);

    let nbAvecResultats = 0, nbReussis = 0, sommeMoyennes = 0;
    inscrits.forEach(e => {
      const resultats = db.prepare(`
        SELECT r.*, c.credits FROM resultats r JOIN cours c ON c.id = r.cours_id
        WHERE r.etudiant_id = ? AND r.promotion_id = ? AND r.annee_academique_id = ? AND r.session = ?
      `).all(e.id, promotionId, anneeId, session);
      if (resultats.length === 0) return;
      nbAvecResultats++;
      let pond = 0, creditsVus = 0;
      resultats.forEach(r => { pond += (r.note / r.note_max) * 20 * r.credits; creditsVus += r.credits; });
      const moyenne = creditsVus > 0 ? pond / creditsVus : 0;
      sommeMoyennes += moyenne;
      if (moyenne >= 10 && resultats.length >= cours.length) nbReussis++;
    });

    return {
      effectif: inscrits.length,
      nbAvecResultats,
      nbReussis,
      tauxReussite: nbAvecResultats > 0 ? ((nbReussis / nbAvecResultats) * 100).toFixed(1) : '0.0',
      moyennePromotion: nbAvecResultats > 0 ? (sommeMoyennes / nbAvecResultats).toFixed(2) : '-',
      totalCredits,
    };
  }

  router.get('/', (req, res) => {
    const session = req.query.session || 'principale';
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);

    const stats = promotions.map(p => ({
      ...p,
      ...calculerStats(p.id, req.anneeActive.id, session),
    }));

    res.render('statistiques', { stats, session });
  });

  return router;
};
