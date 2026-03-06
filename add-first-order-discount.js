const mysql = require('mysql2/promise');
require('dotenv').config();

async function addFirstOrderDiscountColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'myeva_creation'
    });

    console.log('Connected to database');

    // Add column to track if user has used first-order discount
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_order_discount_used BOOLEAN DEFAULT FALSE
    `);

    console.log('Column "first_order_discount_used" added successfully');

    // Update existing users who already have orders to mark discount as used
    await connection.query(`
      UPDATE users u
      SET first_order_discount_used = TRUE
      WHERE EXISTS (
        SELECT 1 FROM orders o WHERE o.user_id = u.id
      )
    `);

    console.log('Existing users with orders marked as discount used');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addFirstOrderDiscountColumn();
