const express = require('express');
const bcrypt = require('bcryptjs');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const annees = db.prepare('SELECT * FROM annees_academiques ORDER BY id DESC').all();
    const utilisateurs = db.prepare('SELECT id, nom_utilisateur, role FROM utilisateurs').all();
    res.render('parametres', { annees, utilisateurs });
  });

  router.post('/annees', (req, res) => {
    const anneePrecedente = db.prepare('SELECT * FROM annees_academiques WHERE active = 1').get();
    const info = db.prepare('INSERT INTO annees_academiques (libelle) VALUES (?)').run(req.body.libelle);
    const nouvelleAnneeId = info.lastInsertRowid;

    if (anneePrecedente) {
      const promotions = db.prepare('SELECT * FROM promotions WHERE annee_academique_id = ?').all(anneePrecedente.id);
      const insererPromotion = db.prepare('INSERT INTO promotions (nom, faculte_id, annee_academique_id) VALUES (?, ?, ?)');
      const insererCours = db.prepare('INSERT INTO cours (nom, credits, promotion_id) VALUES (?, ?, ?)');
      promotions.forEach(p => {
        const nouvId = insererPromotion.run(p.nom, p.faculte_id, nouvelleAnneeId).lastInsertRowid;
        const cours = db.prepare('SELECT * FROM cours WHERE promotion_id = ?').all(p.id);
        cours.forEach(c => insererCours.run(c.nom, c.credits, nouvId));
      });
    }
    res.redirect('/admin/parametres');
  });

  router.post('/annees/:id/activer', (req, res) => {
    db.prepare('UPDATE annees_academiques SET active = 0').run();
    db.prepare('UPDATE annees_academiques SET active = 1 WHERE id = ?').run(req.params.id);
    res.redirect('/admin/parametres');
  });

  router.post('/utilisateurs', (req, res) => {
    const { nom_utilisateur, mot_de_passe } = req.body;
    const hash = bcrypt.hashSync(mot_de_passe, 10);
    db.prepare('INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, role) VALUES (?, ?, ?)')
      .run(nom_utilisateur, hash, 'admin');
    res.redirect('/admin/parametres');
  });

  router.delete('/utilisateurs/:id', (req, res) => {
    if (parseInt(req.params.id) === req.session.userId) return res.redirect('/admin/parametres');
    db.prepare('DELETE FROM utilisateurs WHERE id = ?').run(req.params.id);
    res.redirect('/admin/parametres');
  });

  return router;
};
