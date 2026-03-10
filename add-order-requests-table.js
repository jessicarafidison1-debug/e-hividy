const mysql = require('mysql2/promise');

async function addOrderRequestsTable() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    await connection.query('USE shop');

    // Add first_order_discount_used column to users table if not exists
    try {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS first_order_discount_used BOOLEAN DEFAULT FALSE
      `);
      console.log('first_order_discount_used column added to users table');
    } catch (err) {
      console.log('first_order_discount_used column already exists or error:', err.message);
    }

    // Create order_requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        discount_percent DECIMAL(5, 2) DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        shipping_fee DECIMAL(10, 2) DEFAULT 4000,
        status VARCHAR(50) DEFAULT 'pending',
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        zip VARCHAR(20) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('order_requests table created/exists');

    // Create order_request_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_request_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        request_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES order_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('order_request_items table created/exists');

    // Add approved_request_id column to orders table to link approved requests
    try {
      await connection.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_id INT NULL,
        ADD CONSTRAINT fk_order_request FOREIGN KEY (request_id) REFERENCES order_requests(id) ON DELETE SET NULL
      `);
      console.log('request_id column added to orders table');
    } catch (err) {
      console.log('request_id column already exists or error:', err.message);
    }

    console.log('Database migration completed successfully!');
    await connection.end();

  } catch (error) {
    console.error('Database migration error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

addOrderRequestsTable();
