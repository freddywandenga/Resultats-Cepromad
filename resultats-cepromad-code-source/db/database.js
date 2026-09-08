const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'cepromad.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const anneeCount = db.prepare('SELECT COUNT(*) AS c FROM annees_academiques').get().c;
if (anneeCount === 0) {
  db.prepare('INSERT INTO annees_academiques (libelle, active) VALUES (?, 1)').run('2026-2027');
}

const userCount = db.prepare('SELECT COUNT(*) AS c FROM utilisateurs').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
  console.log('>> Utilisateur par défaut créé : admin / admin123 (à changer après la première connexion)');
}

module.exports = db;
