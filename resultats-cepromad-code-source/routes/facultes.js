const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // --- FACULTES ---
  router.get('/', (req, res) => {
    const facultes = db.prepare('SELECT * FROM facultes ORDER BY nom').all();
    res.render('facultes/liste', { facultes });
  });

  router.post('/', (req, res) => {
    const { nom, sigle } = req.body;
    db.prepare('INSERT INTO facultes (nom, sigle) VALUES (?, ?)').run(nom, sigle);
    res.redirect('/admin/facultes');
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM facultes WHERE id = ?').run(req.params.id);
    res.redirect('/admin/facultes');
  });

  // --- PROMOTIONS ---
  router.get('/promotions', (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom,
        (SELECT COUNT(*) FROM inscriptions i WHERE i.promotion_id = p.id AND i.statut='active') AS effectif
      FROM promotions p JOIN facultes f ON f.id = p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);
    const facultes = db.prepare('SELECT * FROM facultes ORDER BY nom').all();
    res.render('facultes/promotions', { promotions, facultes });
  });

  router.post('/promotions', (req, res) => {
    const { nom, faculte_id } = req.body;
    db.prepare('INSERT INTO promotions (nom, faculte_id, annee_academique_id) VALUES (?, ?, ?)')
      .run(nom, faculte_id, req.anneeActive.id);
    res.redirect('/admin/facultes/promotions');
  });

  router.delete('/promotions/:id', (req, res) => {
    db.prepare('DELETE FROM promotions WHERE id = ?').run(req.params.id);
    res.redirect('/admin/facultes/promotions');
  });

  return router;
};
