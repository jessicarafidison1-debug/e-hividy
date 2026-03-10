const db = require('./config/db');

async function checkDatabase() {
  try {
    const connection = await db.getConnection();
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Tables dans la base de données:');
    console.log(tables.map(t => Object.values(t)).join(', '));
    console.log('');

    // Check order_requests table structure
    const [requestColumns] = await connection.query('DESCRIBE order_requests');
    console.log('📋 Structure de order_requests:');
    requestColumns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
    console.log('');

    // Check orders table structure
    const [orderColumns] = await connection.query('DESCRIBE orders');
    console.log('📋 Structure de orders:');
    orderColumns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
    console.log('');

    // Check users table structure
    const [userColumns] = await connection.query('DESCRIBE users');
    console.log('📋 Structure de users:');
    userColumns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
    console.log('');

    // Check existing users
    const [users] = await connection.query('SELECT id, name, email, first_order_discount_used FROM users');
    console.log('👥 Utilisateurs existants:', users.length);
    users.forEach(u => console.log(`  - ${u.name} (${u.email}) - first_order_discount_used: ${u.first_order_discount_used}`));
    console.log('');

    // Check existing admins
    const [admins] = await connection.query('SELECT id, name, email FROM admins');
    console.log('👨‍💼 Admins existants:', admins.length);
    admins.forEach(a => console.log(`  - ${a.name} (${a.email})`));
    console.log('');

    // Check existing order requests
    const [requests] = await connection.query('SELECT id, user_id, status, total_amount FROM order_requests ORDER BY id DESC LIMIT 5');
    console.log('📦 Dernières demandes de commande:', requests.length);
    requests.forEach(r => console.log(`  - Demande #${r.id} (user: ${r.user_id}) - Statut: ${r.status} - Montant: ${r.total_amount} Ar`));
    console.log('');

    // Check existing orders
    const [orders] = await connection.query('SELECT id, user_id, status, total_amount FROM orders ORDER BY id DESC LIMIT 5');
    console.log('🛒 Dernières commandes:', orders.length);
    orders.forEach(o => console.log(`  - Commande #${o.id} (user: ${o.user_id}) - Statut: ${o.status} - Montant: ${o.total_amount} Ar`));
    console.log('');

    // Check products
    const [products] = await connection.query('SELECT id, name, price, stock FROM products LIMIT 5');
    console.log('📦 Produits (5 premiers):', products.length);
    products.forEach(p => console.log(`  - ${p.name} - ${p.price} Ar (stock: ${p.stock})`));

    connection.release();
    console.log('\n✅ Vérification terminée!');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkDatabase();
