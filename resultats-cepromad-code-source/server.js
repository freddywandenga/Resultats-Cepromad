const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');

const db = require('./db/database');
const { requireAuth, anneeActive } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4322;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cepromad-resultats-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 }
}));

app.locals.formatMontant = (m) => (m || 0).toLocaleString('fr-FR');

// ---- Espace public (étudiants) : aucune authentification ----
app.use('/', anneeActive(db));
app.use('/', require('./routes/public')(db));

// ---- Espace admin ----
app.use('/admin', require('./routes/auth')(db)); // login/logout publics dans /admin
app.use('/admin', requireAuth);
app.use('/admin', anneeActive(db));
app.use('/admin', (req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentPath = req.path;
  next();
});
app.use('/admin', require('./routes/dashboard')(db));
app.use('/admin/facultes', require('./routes/facultes')(db));
app.use('/admin/etudiants', require('./routes/etudiants')(db));
app.use('/admin/cours', require('./routes/cours')(db));
app.use('/admin/resultats', require('./routes/resultats')(db));
app.use('/admin/statistiques', require('./routes/statistiques')(db));
app.use('/admin/parametres', require('./routes/parametres')(db));

app.use((req, res) => res.status(404).send('Page introuvable'));

app.listen(PORT, () => {
  console.log(`\n=== Résultats Cepromad ===`);
  console.log(`Espace public   : http://localhost:${PORT}`);
  console.log(`Espace admin    : http://localhost:${PORT}/admin`);
  console.log(`Connexion admin : admin / admin123\n`);
});
