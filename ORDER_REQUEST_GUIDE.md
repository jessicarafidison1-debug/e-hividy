# Système de Demande de Commande - Guide Complet

## 📋 Vue d'ensemble

Le système de demande de commande permet aux clients de soumettre une demande avant de passer une commande. L'administrateur doit valider cette demande avant que le client ne puisse finaliser sa commande.

## 🔄 Flux de travail

### Côté Client

1. **Ajout au panier** → Le client ajoute des produits à son panier
2. **Checkout** → Le client clique sur "Proceed to Checkout"
3. **Soumission de la demande** :
   - Si c'est la première demande : le client remplit le formulaire de demande
   - Le système vérifie l'éligibilité à la réduction première commande (10%)
   - La demande est soumise avec le statut "pending"
4. **Attente de validation** :
   - Le client voit le statut "En attente de validation" dans son compte
   - Une notification toast apparaît quand la demande est approuvée
5. **Validation automatique** :
   - Quand l'admin valide la demande, la commande est **automatiquement créée et payée**
   - Le statut change directement à "completed" (validée et payée)
   - Le stock des produits est automatiquement déduit
   - Une notification est envoyée au client avec le numéro de commande

### Côté Admin

1. **Notification** → L'admin voit le nombre de demandes en attente dans le menu latéral
2. **Consultation** → L'admin consulte les détails de la demande
3. **Validation/Annulation** :
   - L'admin clique sur "Valider" ou "Annuler"
   - **Si validation** : La commande est automatiquement créée, marquée comme payée, et le stock est mis à jour
   - **Si annulation** : La demande est rejetée, le client peut soumettre une nouvelle demande
   - Une notification automatique est envoyée au client

## 📁 Fichiers modifiés/créés

### Fichiers modifiés :
- `views/account.ejs` - Ajout de l'onglet "Demandes de commande"
- `views/checkout.ejs` - Gestion des statuts de demande (pending/approved)
- `routes/user.js` - Ajout des routes pour les demandes de commande
- `routes/admin.js` - Gestion des validations/annulations
- `routes/checkout.js` - Soumission des demandes

### Fichiers créés :
- `views/order-request-details.ejs` - Page de détails d'une demande
- `views/partials/client-header.ejs` - Header avec système de notification

## 🎯 Fonctionnalités implémentées

### Côté Client :
- ✅ Soumission de demande de commande
- ✅ Affichage du statut (pending/approved/completed/cancelled)
- ✅ Onglet "Demandes de commande" dans le compte
- ✅ Page de détails pour chaque demande
- ✅ Notifications toast en temps réel
- ✅ Badge de notification dans le menu
- ✅ Réduction première commande (10%) automatique
- ✅ Livraison offerte dès 200 000 Ar

### Côté Admin :
- ✅ Liste des demandes avec filtres par statut
- ✅ Détails complets d'une demande
- ✅ Validation rapide (boutons dans la liste)
- ✅ Annulation avec raison optionnelle
- ✅ Notification automatique aux clients
- ✅ Compteur de demandes en attente dans le sidebar

## 📊 Statuts des demandes

| Statut | Description | Action client |
|--------|-------------|---------------|
| `pending` | En attente de validation admin | Attendre |
| `completed` | Demande validée et commande automatiquement créée et payée | Aucune - commande déjà payée |
| `cancelled` | Annulée par l'admin | Peut soumettre nouvelle demande |

## 🔔 Notifications

Les notifications sont envoyées dans les cas suivants :

1. **Demande approuvée et commande créée automatiquement** :
   - Type : `order_approved`
   - Titre : "Commande validée et payée automatiquement"
   - Message : "Votre demande de commande #X a été validée. Votre commande #Y a été automatiquement créée et payée. Montant total payé : Ar XXX"

2. **Demande annulée** :
   - Type : `request_cancelled`
   - Titre : "Demande de commande annulée"
   - Message : "Votre demande de commande #X a été annulée par l'administrateur."

## 🧪 Tests

### Test du flux complet :

1. **Créer un compte client** :
   ```
   - Aller sur /auth/register-page
   - Remplir le formulaire
   ```

2. **Ajouter des produits au panier** :
   ```
   - Parcourir les produits
   - Cliquer sur "Add to Cart"
   ```

3. **Soumettre une demande** :
   ```
   - Aller au panier
   - Cliquer sur "Proceed to Checkout"
   - Remplir les informations de livraison
   - Cliquer sur "Soumettre la demande"
   ```

4. **Vérifier le compte client** :
   ```
   - Aller dans "Compte"
   - Cliquer sur l'onglet "Demandes de commande"
   - Vérifier le statut "En attente"
   ```

5. **Valider avec l'admin** :
   ```
   - Aller sur /admin/login
   - Email: admin@shop.com
   - Mot de passe: admin123
   - Aller dans "Demandes de commande"
   - Cliquer sur "Valider"
   ```

6. **Vérifier la notification** :
   ```
   - Retourner sur le compte client
   - Une notification toast devrait apparaître
   - Le badge de notification devrait afficher "1"
   - Le statut devrait être "Complétée" (commande payée)
   ```

7. **Vérifier la commande automatiquement créée** :
   ```
   - Aller dans "Compte" > "Commandes"
   - La commande #X devrait apparaître avec le statut "Validée"
   - Le statut de la demande dans "Demandes de commande" est "Complétée"
   ```

## 🛠️ Dépannage

### Les notifications ne s'affichent pas ?
- Vérifier que le JavaScript est activé dans le navigateur
- Ouvrir la console (F12) et vérifier les erreurs
- Le polling des notifications se fait toutes les 30 secondes

### La demande reste en "pending" ?
- Vérifier que l'admin n'a pas déjà validé/annulé
- Rafraîchir la page (F5)
- Vérifier dans la base de données la table `order_requests`

### Erreur lors de la soumission ?
- Vérifier que tous les champs sont remplis
- Vérifier le numéro de téléphone (10 chiffres)
- Vérifier que le panier n'est pas vide

## 📝 Base de données

### Tables utilisées :

```sql
-- order_requests : Stocke les demandes
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

-- order_request_items : Articles de la demande
CREATE TABLE order_request_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- notifications : Notifications des utilisateurs
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

## 🚀 Prochaines améliorements possibles

- [ ] Annulation de demande avec raison obligatoire
- [ ] Historique des statuts de demande
- [ ] Export PDF des demandes
- [ ] Filtrage avancé des demandes (par date, statut, etc.)
- [ ] Envoi d'email lors de la validation
- [ ] Chat entre client et admin pour les demandes
