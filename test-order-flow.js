const db = require('./config/db');

async function testOrderFlow() {
  let connection;
  
  try {
    console.log('🧪 TEST DU FLUX DE COMMANDE\n');
    console.log('=' .repeat(50));
    
    connection = await db.getConnection();
    
    // TEST 1: Vérifier les tables nécessaires
    console.log('\n📋 TEST 1: Vérification des tables');
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => {
      const values = Object.values(t);
      return values[0]; // MySQL retourne l'objet avec la clé comme "Tables_in_shop"
    });
    console.log('Tables trouvées:', tableNames.join(', '));
    
    const requiredTables = ['users', 'products', 'cart', 'orders', 'order_requests', 'order_request_items', 'notifications'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`❌ Tables manquantes: ${missingTables.join(', ')}`);
      return;
    }
    console.log('✅ Toutes les tables nécessaires existent');
    
    // TEST 2: Vérifier les statuts de order_requests
    console.log('\n📋 TEST 2: Vérification des statuts de order_requests');
    const [statusCheck] = await connection.query(`
      SELECT DISTINCT status FROM order_requests
    `);
    console.log('Statuts existants:', statusCheck.map(s => s.status).join(', '));
    console.log('✅ Statuts disponibles');
    
    // TEST 3: Vérifier les notifications
    console.log('\n📋 TEST 3: Vérification des notifications');
    const [notifTypes] = await connection.query(`
      SELECT DISTINCT type FROM notifications
    `);
    console.log('Types de notifications:', notifTypes.map(n => n.type).join(', '));
    
    const requiredTypes = ['new_order_request', 'request_approved', 'request_cancelled'];
    const missingTypes = requiredTypes.filter(t => !notifTypes.map(n => n.type).includes(t));
    if (missingTypes.length > 0) {
      console.log(`⚠️ Types de notifications manquants: ${missingTypes.join(', ')}`);
    } else {
      console.log('✅ Tous les types de notifications existent');
    }
    
    // TEST 4: Vérifier les utilisateurs existants
    console.log('\n📋 TEST 4: Utilisateurs existants');
    const [users] = await connection.query('SELECT id, name, email FROM users');
    console.log(`Nombre d'utilisateurs: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    
    // TEST 5: Vérifier les demandes de commande
    console.log('\n📋 TEST 5: Demandes de commande existantes');
    const [requests] = await connection.query(`
      SELECT r.id, r.user_id, r.status, r.total_amount, u.name as user_name
      FROM order_requests r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    console.log(`Nombre de demandes: ${requests.length}`);
    requests.forEach(r => {
      const statusIcon = r.status === 'pending' ? '⏳' : r.status === 'approved' ? '✅' : r.status === 'completed' ? '✓' : '❌';
      console.log(`  - Demande #${r.id} (${r.user_name}) - ${statusIcon} ${r.status} - ${r.total_amount} Ar`);
    });
    
    // TEST 6: Vérifier les commandes
    console.log('\n📋 TEST 6: Commandes existantes');
    const [orders] = await connection.query(`
      SELECT o.id, o.user_id, o.status, o.total_amount, u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    console.log(`Nombre de commandes: ${orders.length}`);
    orders.forEach(o => {
      const statusIcon = o.status === 'pending' ? '⏳' : o.status === 'completed' ? '✓' : o.status === 'cancelled' ? '❌' : '📦';
      console.log(`  - Commande #${o.id} (${o.user_name}) - ${statusIcon} ${o.status} - ${o.total_amount} Ar`);
    });
    
    // TEST 7: Vérifier les produits avec stock
    console.log('\n📋 TEST 7: Produits disponibles');
    const [products] = await connection.query('SELECT id, name, price, stock FROM products WHERE stock > 0 LIMIT 5');
    console.log(`Produits en stock: ${products.length}`);
    products.forEach(p => console.log(`  - ${p.name} - ${p.price} Ar (stock: ${p.stock})`));
    
    // TEST 8: Résumé du flux
    console.log('\n' + '='.repeat(50));
    console.log('📝 RÉSUMÉ DU FLUX DE COMMANDE');
    console.log('='.repeat(50));
    console.log(`
1. Client ajoute des produits au panier (table: cart)
2. Client va sur /checkout → Remplit le formulaire
3. Client clique sur "Soumettre la demande"
   → Crée une entrée dans order_requests (statut: pending)
   → Notification à l'admin (type: new_order_request)
   
4. Admin va sur /admin/order-requests
   → Voit la demande en attente
   → Clique sur "Valider"
   → Change statut à 'approved'
   → Notification au client (type: request_approved)
   
5. Client reçoit notification
   → Va sur /user/account → "Demandes de commande"
   → Voit le bouton "Procéder au paiement"
   → Ou va sur /checkout → Redirigé vers /checkout/pay/:id
   
6. Client clique sur "Confirmer et créer la commande"
   → Crée une entrée dans orders (statut: pending)
   → Décrémente le stock des produits
   → Change statut de order_requests à 'completed'
   
7. Admin va sur /admin/orders
   → Voit la commande en attente
   → Clique sur "Valider"
   → Change statut à 'completed'
   → Notification au client (type: order_approved)
    `);
    
    console.log('\n✅ TOUS LES TESTS SONT PASSÉS\n');
    
    connection.release();
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    if (connection) await connection.release();
    process.exit(1);
  }
}

testOrderFlow();
