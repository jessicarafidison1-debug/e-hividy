# 🎯 Guide des Indicateurs de Notifications

## 📍 Où apparaissent les notifications

### 🔴 Côté Administrateur

```
┌─────────────────────────────────────┐
│  Tableau de bord                    │
│  Produits                          │
│  Commandes                    [2]  │ ← Badge rouge
│                                     │
└─────────────────────────────────────┘
         ↑ Sidebar Admin
```

**Signification :**
- Le badge rouge `[2]` signifie **2 commandes en attente de validation**
- Cliquez sur "Commandes" pour voir et traiter les commandes
- Le badge se met à jour automatiquement toutes les 30 secondes
- Disparaît quand il n'y a plus de commandes en attente

**Actions possibles :**
- ✅ Valider une commande (badge diminue)
- ❌ Annuler une commande (badge diminue)

---

### 🔔 Côté Client

```
┌─────────────────────────────────────────────────────┐
│  Myeva Creation    [Recherche]                      │
│                                                      │
│  Accueil | Compte | Panier | 🔔 Notifications [1] | │ ← Badge rouge
│                       Déconnexion                    │
└─────────────────────────────────────────────────────┘
         ↑ Header du site
```

**Signification :**
- Le badge rouge `[1]` signifie **1 notification non lue**
- Cliquez sur "🔔 Notifications" pour ouvrir le panneau
- Le badge se met à jour automatiquement toutes les 30 secondes
- Disparaît quand vous ouvrez le panneau des notifications

**Types de notifications :**
- ✅ **Commande validée** - L'admin a accepté votre commande
- ❌ **Commande annulée** - L'admin a annulé votre commande
- 📦 **Autre** - Autres mises à jour de commande

---

## 🔄 Flux complet

```
┌─────────────┐
│   CLIENT    │
│  Passe une  │
│  commande   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Statut: "En attente" (pending) │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────┐         ┌─────────────────┐
│   CLIENT voit   │         │   ADMIN voit    │
│  "⏳ En attente │         │  Badge rouge    │
│  de validation" │         │  sur Commandes  │
└─────────────────┘         └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Admin clique   │
                            │  ✅ ou ❌       │
                            └────────┬────────┘
                                     │
                                     ▼
┌─────────────────┐         ┌─────────────────┐
│   CLIENT reçoit │         │  Commande mise  │
│   notification  │◄────────┤  à jour + Stock │
│   🔔 Badge rouge│         │  réajusté       │
└─────────────────┘         └─────────────────┘
```

---

## 🎨 Codes couleur

| Couleur | Signification | Exemple |
|---------|---------------|---------|
| 🔴 Rouge | Action requise / Nouveau | Commandes en attente, Notifications non lues |
| 🟢 Vert | Validé / Succès | Commande validée |
| 🟠 Orange | En attente | Statut de commande |
| 🔴 Rouge | Annulé / Échec | Commande annulée |

---

## ⏱️ Mise à jour automatique

**Fréquence :** Toutes les 30 secondes

**Admin :**
- Vérifie le nombre de commandes en attente
- Badge mis à jour sans rechargement de page

**Client :**
- Vérifie le nombre de notifications non lues
- Badge mis à jour sans rechargement de page

---

## 🧪 Scénarios de test

### Test 1 : Nouvelle commande
1. Client passe une commande
2. Admin voit le badge rouge apparaître sur "Commandes"
3. Client voit "⏳ En attente de validation"

### Test 2 : Validation admin
1. Admin clique sur "Commandes"
2. Admin clique ✅ sur une commande
3. Badge admin diminue de 1
4. Client reçoit notification ✅
5. Badge notification client apparaît
6. Client voit "✅ Commande validée"

### Test 3 : Annulation admin
1. Admin clique ❌ sur une commande
2. Admin entre une raison (optionnel)
3. Badge admin diminue de 1
4. Client reçoit notification ❌
5. Badge notification client apparaît
6. Client voit "❌ Commande annulée"
7. Produits retournent en stock

---

## 📱 Responsive

**Mobile :**
- Badge visible sur les icônes de menu
- Menu hamburger inclut les notifications

**Desktop :**
- Badge toujours visible
- Panneau de notifications déroulant

---

## 🔧 Dépannage

**Le badge n'apparaît pas ?**
- Vérifiez que JavaScript est activé
- Rafraîchissez la page (F5)
- Vérifiez la console du navigateur (F12)

**Le badge ne se met pas à jour ?**
- Attendez 30 secondes (cycle de mise à jour)
- Vérifiez votre connexion Internet
- Redémarrez le serveur Node.js

**Badge stuck avec ancienne valeur ?**
- Rechargez la page complètement
- Videz le cache du navigateur

---

## 💡 Bonnes pratiques

**Pour l'Admin :**
- ✅ Traitez les commandes en attente rapidement
- ✅ Annulez avec une raison claire si nécessaire
- ✅ Surveillez le badge pour les nouvelles commandes

**Pour le Client :**
- ✅ Surveillez vos notifications après une commande
- ✅ Ouvrez le panneau de notifications régulièrement
- ✅ Vérifiez le statut de vos commandes dans "Compte"

---

## 📊 Statistiques

**Temps moyen de traitement :**
- Validation : < 1 minute
- Notification client : < 30 secondes
- Mise à jour badge : 30 secondes

**Performance :**
- API légère (COUNT SQL)
- Pas de rechargement de page
- Impact minimal sur le serveur
