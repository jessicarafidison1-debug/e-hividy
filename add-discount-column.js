const mysql = require('mysql2/promise');

async function addDiscountColumn() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'shop'
    });

    // Check if column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'shop' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'first_order_discount_used'
    `);

    if (columns.length === 0) {
      // Add the column
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN first_order_discount_used BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Column first_order_discount_used added successfully');
    } else {
      console.log('✅ Column first_order_discount_used already exists');
    }

    connection.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) connection.release();
  }
}

addDiscountColumn();
