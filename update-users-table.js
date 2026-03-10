const mysql = require('mysql2/promise');

async function updateDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'shop'
    });

    console.log('Connected to database');

    // Add first_order_discount_used column if not exists
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS first_order_discount_used BOOLEAN DEFAULT FALSE
      `);
      console.log('✓ Column first_order_discount_used added/exists');
    } catch (err) {
      console.log('Column first_order_discount_used already exists');
    }

    // Add payment_status column to orders if not exists (optional for future use)
    try {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'
      `);
      console.log('✓ Column payment_status added/exists');
    } catch (err) {
      console.log('Column payment_status already exists');
    }

    // Set default value for existing users
    await connection.query(`
      UPDATE users 
      SET first_order_discount_used = FALSE 
      WHERE first_order_discount_used IS NULL
    `);
    console.log('✓ Existing users updated with default value');

    console.log('\n✅ Database update completed successfully!');
    await connection.end();

  } catch (error) {
    console.error('Database update error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

updateDatabase();
