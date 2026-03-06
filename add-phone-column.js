const mysql = require('mysql2/promise');

async function addPhoneColumn() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'shop'
    });

    // Add phone column to orders table
    await connection.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL AFTER zip
    `);
    
    console.log('Column "phone" added to orders table successfully!');
    await connection.end();

  } catch (error) {
    console.error('Error adding phone column:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

addPhoneColumn();
