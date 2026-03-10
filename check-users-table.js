const db = require('./config/db');

async function checkUsersTable() {
  try {
    const conn = await db.getConnection();
    const [columns] = await conn.query('DESCRIBE users');
    console.log('Users table columns:');
    console.log(JSON.stringify(columns, null, 2));
    
    // Check if first_order_discount_used column exists
    const hasColumn = columns.some(col => col.Field === 'first_order_discount_used');
    console.log('\nHas first_order_discount_used column:', hasColumn);
    
    conn.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsersTable();
