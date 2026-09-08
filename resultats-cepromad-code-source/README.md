# Résultats Cepromad — Application web

Application web de publication des résultats pour l'Université de Cepromad.

## 🚀 Installation et démarrage

```bash
npm install
npm start
```

- **Espace public (étudiants)** : http://localhost:4322
- **Espace administration** : http://localhost:4322/admin
  - Identifiant : `admin`
  - Mot de passe : `admin123` (à changer immédiatement dans *Paramètres*)

Le port peut être changé avec la variable d'environnement `PORT` (ex: `PORT=8080 npm start`).

## 📁 Données

Toutes les données sont stockées dans un fichier unique SQLite : `data/cepromad.db`, créé automatiquement au premier démarrage. Sauvegardez ce fichier régulièrement.

## 🧩 Fonctionnement

### Espace administration (`/admin`)
1. **Facultés** puis **Promotions** : créer la structure de l'université (ex: Faculté des Sciences → L1 Informatique).
2. **Cours** : définir le curriculum (matières + crédits) de chaque promotion.
3. **Étudiants** : inscrire les étudiants dans une promotion (matricule généré automatiquement, ou personnalisé).
4. **Saisie des notes** : manuellement par promotion/cours/session, ou via **Import Excel** (fichier .xlsx/.csv avec colonnes `matricule` et `note`).
5. **Publication** : tant qu'une session (principale ou rattrapage) n'est pas publiée pour une promotion, les étudiants ne peuvent PAS voir leurs résultats de cette session — même déjà saisis. C'est le bouton "Publier" qui les rend visibles.
6. **Statistiques** : taux de réussite et moyenne par promotion.

### Espace public (`/`)
Un étudiant entre son **matricule** et son **nom** ; s'ils correspondent et que les résultats de sa promotion sont publiés, son relevé de notes s'affiche (imprimable), avec :
- Le détail des notes par cours
- La moyenne générale pondérée par les crédits
- Les crédits obtenus
- La décision (RÉUSSI(E) / AJOURNÉ(E))

## 🌐 Déploiement en ligne

Cette application est un serveur Node.js standard (Express). Pour la rendre accessible en ligne :
1. Déployer le code sur un serveur/VPS (ou un service comme Render, Railway, un hébergement mutualisé avec support Node.js, etc.).
2. Lancer avec un gestionnaire de processus comme **PM2** pour qu'elle reste active :
   ```bash
   npm install -g pm2
   pm2 start server.js --name resultats-cepromad
   ```
3. Mettre un nom de domaine devant (ex: `resultats.cepromad.cd`) via un reverse proxy (Nginx) ou directement chez l'hébergeur.
4. Penser à changer `SESSION_SECRET` (variable d'environnement) et le mot de passe admin par défaut avant la mise en ligne.

## 🛠️ Stack technique

Node.js, Express, EJS, SQLite (better-sqlite3), SheetJS (import Excel).
