const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const annee = req.anneeActive;
    const nbEtudiants = db.prepare(`
      SELECT COUNT(*) AS c FROM inscriptions WHERE annee_academique_id = ? AND statut = 'active'
    `).get(annee.id).c;
    const nbFacultes = db.prepare('SELECT COUNT(*) AS c FROM facultes').get().c;
    const nbPromotions = db.prepare('SELECT COUNT(*) AS c FROM promotions WHERE annee_academique_id = ?').get(annee.id).c;
    const nbResultats = db.prepare('SELECT COUNT(*) AS c FROM resultats WHERE annee_academique_id = ?').get(annee.id).c;

    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom,
        (SELECT COUNT(*) FROM inscriptions i WHERE i.promotion_id = p.id AND i.statut='active') AS effectif,
        (SELECT publie FROM publications pub WHERE pub.promotion_id = p.id AND pub.annee_academique_id = p.annee_academique_id AND pub.session='principale') AS publie
      FROM promotions p JOIN facultes f ON f.id = p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(annee.id);

    res.render('admin/dashboard', { nbEtudiants, nbFacultes, nbPromotions, nbResultats, promotions });
  });

  return router;
};
