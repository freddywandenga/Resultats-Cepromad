CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom_utilisateur TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  cree_le TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS annees_academiques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle TEXT UNIQUE NOT NULL,
  active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS facultes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  sigle TEXT
);

CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  faculte_id INTEGER NOT NULL,
  annee_academique_id INTEGER NOT NULL,
  FOREIGN KEY (faculte_id) REFERENCES facultes(id) ON DELETE CASCADE,
  FOREIGN KEY (annee_academique_id) REFERENCES annees_academiques(id)
);

CREATE TABLE IF NOT EXISTS etudiants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  postnom TEXT,
  prenom TEXT,
  sexe TEXT,
  cree_le TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etudiant_id INTEGER NOT NULL,
  promotion_id INTEGER NOT NULL,
  annee_academique_id INTEGER NOT NULL,
  statut TEXT DEFAULT 'active',
  FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id),
  FOREIGN KEY (annee_academique_id) REFERENCES annees_academiques(id)
);

CREATE TABLE IF NOT EXISTS cours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  credits REAL NOT NULL DEFAULT 1,
  promotion_id INTEGER NOT NULL,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resultats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etudiant_id INTEGER NOT NULL,
  cours_id INTEGER NOT NULL,
  promotion_id INTEGER NOT NULL,
  annee_academique_id INTEGER NOT NULL,
  note REAL NOT NULL,
  note_max REAL DEFAULT 20,
  session TEXT NOT NULL DEFAULT 'principale',
  FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE,
  FOREIGN KEY (cours_id) REFERENCES cours(id) ON DELETE CASCADE,
  UNIQUE(etudiant_id, cours_id, session, annee_academique_id)
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  annee_academique_id INTEGER NOT NULL,
  session TEXT NOT NULL DEFAULT 'principale',
  publie INTEGER DEFAULT 0,
  date_publication TEXT,
  UNIQUE(promotion_id, annee_academique_id, session)
);
