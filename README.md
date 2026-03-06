# Boutique E-Commerce Myeva creation

Une application web e-commerce complète construite avec Node.js, Express.js et MySQL.

## Fonctionnalités

- **Authentification des Utilisateurs** : Inscription et Connexion avec cryptage des mots de passe.
- **Catalogue de Produits** : Parcourir les produits avec des informations détaillées, recherche et tri.
- **Panier d'Achat** : Ajouter/supprimer des articles du panier.
- **Paiement (Checkout)** : Passer une commande avec les informations de livraison.
- **Gestion du Compte** : Consulter l'historique des commandes et gérer sa liste de souhaits (Wishlist).
- **Liste de Souhaits (Wishlist)** : Sauvegarder des produits pour plus tard.
- **Panneau d'Administration** : Gérer les produits, voir les statistiques et les commandes.
- **Design Réactif** : Fonctionne sur les ordinateurs et les appareils mobiles.
- **Gestion des Sessions** : Sessions utilisateur sécurisées.

## Prérequis

- **Node.js** (v14 ou supérieure)
- **MySQL** (via XAMPP, WAMP ou installation directe)
- **npm** (inclus avec Node.js)

## Guide d'Installation

### 1. Cloner ou naviguer vers le répertoire du projet
```bash
cd c:\xampp\htdocs\Myeva creation
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration de l'environnement
Copiez le fichier `.env.example` vers un nouveau fichier nommé `.env` :
```bash
cp .env.example .env
```
Éditez le fichier `.env` pour configurer vos accès à la base de données :
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=shop
PORT=3000
SESSION_SECRET=votre_cle_secrete
```

### 4. Initialisation de la base de données
Assurez-vous que votre serveur MySQL est démarré, puis exécutez le script d'initialisation :
```bash
npm run setup
```
Ce script créera automatiquement la base de données `shop`, les tables nécessaires et insérera des produits de démonstration ainsi qu'un compte administrateur par défaut.

**Identifiants Admin par défaut :**
- **Email :** `admin@shop.com`
- **Mot de passe :** `admin123`

### 5. Démarrer le serveur
Pour démarrer en mode production :
```bash
npm start
```
Pour le développement (avec rechargement automatique via nodemon) :
```bash
npm run dev
```

### 6. Accéder à l'application
- **Boutique :** Ouvrez votre navigateur sur `http://localhost:3000`
- **Administration : `http://localhost:3000/admin/login`

## Structure du Projet

```
Myeva creation/
├── server.js              # Fichier principal de l'application
├── db-setup.js            # Script d'initialisation de la base de données
├── config/
│   └── db.js              # Configuration de la connexion MySQL
├── routes/
│   ├── auth.js            # Routes d'authentification (login, register)
│   ├── products.js        # Routes des produits (catalogue, détails)
│   ├── cart.js            # Routes du panier
│   ├── checkout.js        # Routes de commande et paiement
│   ├── user.js            # Routes du profil utilisateur (commandes, wishlist)
│   └── admin.js           # Routes du panneau d'administration
├── views/
│   ├── index.ejs          # Page d'accueil (listing produits)
│   ├── product.ejs        # Détails d'un produit
│   ├── account.ejs        # Profil utilisateur (Dashboard, Commandes, Wishlist)
│   ├── cart.ejs           # Page du panier
│   ├── checkout.ejs       # Page de paiement
│   └── admin/             # Vues de l'administration
└── public/
    ├── style.css          # Styles CSS principaux
    ├── admin.css          # Styles CSS pour l'administration
    └── uploads/           # Images des produits téléchargées
```

## Utilisation

### Inscription d'un nouveau compte
1. Cliquez sur le lien "Register" (ou Inscription).
2. Remplissez le nom, l'email et le mot de passe.
3. Validez l'inscription.

### Passer une commande
1. Ajoutez un ou plusieurs produits au panier.
2. Allez dans le panier et cliquez sur "Proceed to Checkout".
3. Remplissez vos informations de livraison.
4. Confirmez la commande.

### Administration
1. Connectez-vous via `/admin/login`.
2. Gérez le stock des produits et visualisez les ventes récentes sur le tableau de bord.

## Sécurité

- Hachage des mots de passe avec **bcryptjs**.
- Protection contre les injections SQL via des requêtes préparées.
- Sessions sécurisées avec **express-session**.
- Protection XSS grâce au moteur de template EJS.

## Support

En cas de problème ou de question, veuillez consulter les logs du serveur ou contacter l'équipe de développement.

## Licence

ISC
