function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login');
}

function anneeActive(db) {
  return function (req, res, next) {
    const annee = db.prepare('SELECT * FROM annees_academiques WHERE active = 1').get()
      || db.prepare('SELECT * FROM annees_academiques ORDER BY id DESC LIMIT 1').get();
    req.anneeActive = annee;
    res.locals.anneeActive = annee;
    next();
  };
}

module.exports = { requireAuth, anneeActive };
