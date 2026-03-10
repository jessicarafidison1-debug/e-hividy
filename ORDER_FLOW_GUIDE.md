# 📦 Système de Commande - Guide Complet

## 🔄 Flux de Commande (Mise à jour 2026)

### Vue d'ensemble

Le système permet aux **clients** (nouveaux ou existants) de passer des commandes via un processus de validation en deux étapes :

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CLIENT    │     │    ADMIN    │     │   CLIENT    │     │    ADMIN    │
│             │     │             │     │             │     │             │
│ 1. Panier   │────▶│             │     │             │     │             │
│ 2. Demande  │────▶│ 3. Notif    │     │             │     │             │
│    En attente│    │    ✅ Validée│────▶│ 4. Paiement │────▶│ 5. Validation│
│             │     │             │     │             │     │    Complétée │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 📋 Étapes Détaillées

### ÉTAPE 1 : Le client ajoute des produits au panier
- Le client parcourt les produits sur `/`
- Clique sur "Add to Cart" pour chaque produit
- Peut voir son panier sur `/cart`

### ÉTAPE 2 : Le client soumet une demande de commande
- Clique sur "Proceed to Checkout"
- Remplit le formulaire de livraison :
  - Adresse
  - Ville
  - Province
  - Code postal
  - Téléphone (10 chiffres)
- Clique sur **"Soumettre la demande"**
- **Statut :** `pending` (En attente de validation)
- **Notification envoyée à l'admin** : `new_order_request`

### ÉTAPE 3 : L'admin valide la demande
- Reçoit une notification
- Va sur `/admin/order-requests`
- Voit la demande avec les détails
- Clique sur **"Valider"** ou **"Annuler"**
- **Si validé :** Statut change à `approved`
- **Notification envoyée au client** : `request_approved`

### ÉTAPE 4 : Le client procède au paiement
- Reçoit la notification "Demande de commande validée"
- Va sur `/user/account` → Onglet "Demandes de commande"
- Voit le bouton **"Procéder au paiement"** (vert)
- Ou va sur `/checkout` → Redirigé automatiquement vers `/checkout/pay/:id`
- Voit le récapitulatif de la commande
- Clique sur **"Confirmer et créer la commande"**
- **Statut de la demande :** `completed`
- **Statut de la commande :** `pending` (en attente de validation finale)
- **Stock des produits :** Décrémenté automatiquement

### ÉTAPE 5 : L'admin valide la commande
- Va sur `/admin/orders`
- Voit la commande en attente
- Clique sur **"Valider"**
- **Statut de la commande :** `completed`
- **Notification envoyée au client** : `order_approved`

---

## 📊 Statuts des Demandes de Commande

| Statut | Signification | Action du Client |
|--------|---------------|------------------|
| `pending` | En attente de validation admin | Attendre la validation |
| `approved` | Validée par l'admin | **Procéder au paiement** |
| `completed` | Demande convertie en commande | Aucune - commande créée |
| `cancelled` | Annulée par l'admin | Peut soumettre une nouvelle demande |

## 📊 Statuts des Commandes

| Statut | Signification |
|--------|---------------|
| `pending` | En attente de validation admin |
| `completed` | Commande validée et terminée |
| `cancelled` | Commande annulée |

---

## 🔔 Notifications

### Pour le Client
| Type | Titre | Message |
|------|-------|---------|
| `request_approved` | Demande de commande validée | "Votre demande de commande #X a été validée. Vous pouvez maintenant procéder au paiement." |
| `order_approved` | Commande validée | "Votre commande #X a été validée avec succès." |
| `order_cancelled` | Commande annulée | "Votre commande #X a été annulée." |

### Pour l'Admin
| Type | Titre | Message |
|------|-------|---------|
| `new_order_request` | Nouvelle demande de commande | "Une nouvelle demande de commande #X est en attente de validation." |

---

## 🎯 Fonctionnalités Spéciales

### Réduction Première Commande (10%)
- Automatiquement appliquée pour la **première commande** d'un utilisateur
- Désactivée après la première utilisation
- Visible dans le récapitulatif de commande

### Livraison Gratuite
- Offerte pour les commandes ≥ **200 000 Ar** (après réduction)
- Sinon : **4 000 Ar** de frais de livraison

---

## 📁 Fichiers du Système

### Routes
- `routes/checkout.js` - Gestion des demandes et paiements
- `routes/admin.js` - Validation des demandes et commandes
- `routes/user.js` - Compte client et historique

### Vues
- `views/checkout.ejs` - Page de soumission de demande
- `views/payment.ejs` - Page de paiement (nouveau)
- `views/account.ejs` - Compte client avec onglet "Demandes de commande"
- `views/order-request-details.ejs` - Détails d'une demande
- `views/partials/client-header.ejs` - Header avec notifications

### Base de Données
```sql
-- Table: order_requests
CREATE TABLE order_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  shipping_fee DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: order_request_items
CREATE TABLE order_request_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- Table: orders
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  phone VARCHAR(20),
  request_id INT,
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: notifications
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_id INT,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Test du Flux Complet

### 1. Se connecter en tant que client
```
URL: http://localhost:3000/auth/login-page
Email: (votre email)
Mot de passe: (votre mot de passe)
```

### 2. Ajouter des produits au panier
```
1. Aller sur http://localhost:3000/
2. Cliquer sur "Add to Cart" pour plusieurs produits
3. Aller sur /cart pour vérifier
```

### 3. Soumettre une demande
```
1. Cliquer sur "Proceed to Checkout"
2. Remplir le formulaire de livraison
3. Cliquer sur "Soumettre la demande"
4. Statut: "En attente de validation"
```

### 4. Se connecter en admin
```
URL: http://localhost:3000/admin/login
Email: admin@shop.com
Mot de passe: admin123
```

### 5. Valider la demande (Admin)
```
1. Aller sur /admin/order-requests
2. Cliquer sur "Valider" pour la demande en attente
```

### 6. Procéder au paiement (Client)
```
1. Se reconnecter en tant que client
2. Aller sur /user/account → "Demandes de commande"
3. Cliquer sur "Procéder au paiement"
4. Cliquer sur "Confirmer et créer la commande"
```

### 7. Valider la commande (Admin)
```
1. Retourner sur /admin/orders
2. Cliquer sur "Valider" pour la commande
3. Statut: "completed"
```

---

## ✅ Vérifications Automatiques

Le système vérifie automatiquement :
- ✅ Stock disponible pour tous les produits
- ✅ Formulaire de livraison complet
- ✅ Numéro de téléphone valide (10 chiffres)
- ✅ Pas de demande en attente pour le même utilisateur
- ✅ Réduction première commande appliquée correctement
- ✅ Livraison gratuite si ≥ 200 000 Ar

---

## 🚀 URLs Importantes

| Page | URL |
|------|-----|
| Accueil | `/` |
| Panier | `/cart` |
| Checkout | `/checkout` |
| Compte Client | `/user/account` |
| Login Admin | `/admin/login` |
| Dashboard Admin | `/admin/dashboard` |
| Demandes (Admin) | `/admin/order-requests` |
| Commandes (Admin) | `/admin/orders` |

---

## 📞 Support

Pour toute question ou problème, contactez l'administrateur.
