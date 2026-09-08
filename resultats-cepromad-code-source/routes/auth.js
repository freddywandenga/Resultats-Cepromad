const express = require('express');
const bcrypt = require('bcryptjs');

module.exports = function (db) {
  const router = express.Router();

  router.get('/login', (req, res) => {
    res.render('admin/login', { erreur: null, layout: false });
  });

  router.post('/login', (req, res) => {
    const { nom_utilisateur, mot_de_passe } = req.body;
    const user = db.prepare('SELECT * FROM utilisateurs WHERE nom_utilisateur = ?').get(nom_utilisateur);
    if (!user || !bcrypt.compareSync(mot_de_passe || '', user.mot_de_passe)) {
      return res.render('admin/login', { erreur: 'Identifiants incorrects', layout: false });
    }
    req.session.userId = user.id;
    req.session.nomUtilisateur = user.nom_utilisateur;
    res.redirect('/admin');
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
  });

  router.get('/changer-mot-de-passe', (req, res) => {
    if (!req.session.userId) return res.redirect('/admin/login');
    res.locals.session = req.session;
    res.locals.currentPath = req.path;
    res.locals.anneeActive = db.prepare('SELECT * FROM annees_academiques WHERE active = 1').get();
    res.render('admin/changer-mot-de-passe', { erreur: null, succes: null });
  });

  router.post('/changer-mot-de-passe', (req, res) => {
    if (!req.session.userId) return res.redirect('/admin/login');
    res.locals.session = req.session;
    res.locals.currentPath = req.path;
    res.locals.anneeActive = db.prepare('SELECT * FROM annees_academiques WHERE active = 1').get();
    const { ancien, nouveau, confirmation } = req.body;
    const user = db.prepare('SELECT * FROM utilisateurs WHERE id = ?').get(req.session.userId);
    if (!bcrypt.compareSync(ancien || '', user.mot_de_passe)) {
      return res.render('admin/changer-mot-de-passe', { erreur: 'Ancien mot de passe incorrect', succes: null });
    }
    if (!nouveau || nouveau !== confirmation) {
      return res.render('admin/changer-mot-de-passe', { erreur: 'Les nouveaux mots de passe ne correspondent pas', succes: null });
    }
    const hash = bcrypt.hashSync(nouveau, 10);
    db.prepare('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?').run(hash, user.id);
    res.render('admin/changer-mot-de-passe', { erreur: null, succes: 'Mot de passe modifié avec succès' });
  });

  return router;
};
