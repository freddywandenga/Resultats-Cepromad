const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, f.nom AS faculte_nom FROM promotions p JOIN facultes f ON f.id=p.faculte_id
      WHERE p.annee_academique_id = ? ORDER BY f.nom, p.nom
    `).all(req.anneeActive.id);
    const promotionId = req.query.promotion_id || (promotions[0] && promotions[0].id);
    let cours = [];
    if (promotionId) {
      cours = db.prepare('SELECT * FROM cours WHERE promotion_id = ? ORDER BY nom').all(promotionId);
    }
    res.render('cours/liste', { promotions, promotionId, cours });
  });

  router.post('/', (req, res) => {
    const { nom, credits, promotion_id } = req.body;
    db.prepare('INSERT INTO cours (nom, credits, promotion_id) VALUES (?, ?, ?)').run(nom, credits || 1, promotion_id);
    res.redirect('/admin/cours?promotion_id=' + promotion_id);
  });

  router.delete('/:id', (req, res) => {
    const c = db.prepare('SELECT promotion_id FROM cours WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM cours WHERE id = ?').run(req.params.id);
    res.redirect('/admin/cours?promotion_id=' + (c ? c.promotion_id : ''));
  });

  return router;
};
