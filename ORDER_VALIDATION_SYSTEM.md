# Système de Validation des Commandes

## 📋 Vue d'ensemble

Ce système permet à l'administrateur de valider ou d'annuler les commandes passées par les clients, avec un système de notifications en temps réel.

## 🔄 Flux de commande

1. **Client passe une commande** → Statut: `pending` (en attente)
2. **Admin reçoit la notification** → Peut voir la commande dans `/admin/orders`
3. **Admin valide ou annule** → Le client reçoit une notification
4. **Client reçoit la confirmation** → Statut mis à jour dans son compte

## 🗂️ Modifications apportées

### Base de données

**Nouvelle table `notifications` :**
- `id` : Identifiant unique
- `user_id` : ID du client concerné
- `order_id` : ID de la commande (optionnel)
- `type` : Type de notification (`order_approved`, `order_cancelled`)
- `title` : Titre de la notification
- `message` : Message détaillé
- `is_read` : Statut de lecture
- `created_at` : Date de création

**Table `orders` mise à jour :**
- Statut par défaut : `pending` au lieu de `completed`
- Colonne `phone` ajoutée

**Nouvelle table `order_status_history` :**
- Historique des changements de statut

### Backend

**Routes admin (`/routes/admin.js`) :**
- `POST /admin/orders/:id/approve` - Valider une commande
- `POST /admin/orders/:id/cancel` - Annuler une commande

**Routes user (`/routes/user.js`) :**
- `GET /user/notifications` - Récupérer les notifications
- `POST /user/notifications/:id/read` - Marquer comme lu

### Frontend Admin

**Page de liste des commandes (`/views/admin/orders-list.ejs`) :**
- Boutons rapides ✅/❌ pour les commandes en attente
- Statut mis en évidence

**Page de détails (`/views/admin/order-details.ejs`) :**
- Boutons "Valider la commande" et "Annuler la commande"
- Confirmations avec messages
- Boutons uniquement visibles pour le statut `pending`

### Frontend Client

**Page de détails de commande (`/views/order-details.ejs`) :**
- Affichage du statut avec icônes :
  - ⏳ En attente de validation
  - ✅ Validée
  - ❌ Annulée
- Messages d'information selon le statut

**Header (`/views/partials/header.ejs`) :**
- 🔔 Icône de notification avec badge
- Fenêtre modale des notifications
- Vérification automatique toutes les 30 secondes

## 🚀 Installation

1. **Mettre à jour la base de données :**
```bash
node update-db.js
```

2. **Redémarrer le serveur :**
```bash
npm start
```

## 📱 Utilisation

### Côté Admin

1. Connectez-vous à `/admin/login` (admin@shop.com / admin123)
2. Allez dans "Commandes" dans le menu
3. Les commandes en attente ont des boutons ✅ et ❌
4. Cliquez pour valider ou annuler
5. Une raison peut être demandée pour l'annulation

### Côté Client

1. Passez une commande normalement
2. La commande est "En attente de validation"
3. Une notification apparaît quand l'admin statue
4. Le statut est visible dans "Compte" > "Commandes"

## 🔔 Types de notifications

| Type | Titre | Message |
|------|-------|---------|
| `order_approved` | Commande validée | Votre commande #X a été validée avec succès. Montant: ArXXX |
| `order_cancelled` | Commande annulée | Votre commande #X a été annulée. Montant remboursé: ArXXX |

## 🎯 Indicateurs visuels de notifications

### Côté Client
- 🔔 **Badge rouge sur "Notifications"** dans le menu header
- Affiche le nombre de notifications non lues
- Mise à jour automatique toutes les 30 secondes
- Clique pour ouvrir le panneau des notifications

### Côté Admin
- 🔴 **Badge rouge sur "Commandes"** dans la sidebar
- Affiche le nombre de commandes en attente de validation
- Mise à jour automatique toutes les 30 secondes
- Disparaît quand toutes les commandes sont traitées

## 🎨 Styles

**Boutons admin :**
- `.admin-btn-success` - Vert pour valider
- `.admin-btn-danger` - Rouge pour annuler

**Statuts de commande :**
- `.status-pending` - Orange
- `.status-completed` - Vert
- `.status-cancelled` - Rouge

## 📝 Notes importantes

- Les commandes annulées réintègrent automatiquement les produits en stock
- L'historique des statuts est conservé dans `order_status_history`
- Les notifications sont marquées comme lues automatiquement à l'ouverture
- Le badge de notification se met à jour toutes les 30 secondes

## 🔧 Fichiers modifiés

```
/routes/admin.js          - Ajout des routes approve/cancel + API pending-count
/routes/user.js           - Ajout des routes notifications + API notification-count
/routes/checkout.js       - Statut 'pending' par défaut
/views/admin/orders-list.ejs      - Boutons rapides
/views/admin/order-details.ejs    - Boutons + scripts
/views/admin/partials/sidebar.ejs - Badge notifications admin
/views/admin/partials/scripts.ejs - Check auto notifications
/views/order-details.ejs          - Affichage du statut
/views/partials/header.ejs        - Notifications UI + badge
/public/admin.css                 - Styles boutons
/db-setup.js                      - Tables mises à jour
/update-db.js (nouveau)           - Script de migration
```

## 🧪 Tests

1. Créez un compte client
2. Passez une commande
3. Vérifiez le statut "En attente"
4. Connectez-vous en admin
5. Validez/Annulez la commande
6. Reconnectez-vous en client
7. Vérifiez la notification et le statut

## 📞 Support

Pour toute question ou problème, consultez les logs du serveur ou la base de données.
