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

    // Add phone column to orders table if not exists
    try {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL AFTER zip
      `);
      console.log('✓ Column "phone" added to orders table');
    } catch (err) {
      console.log('ℹ Column "phone" already exists or error:', err.message);
    }

    // Create notifications table if not exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          order_id INT,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        )
      `);
      console.log('✓ Table "notifications" created');
    } catch (err) {
      console.log('ℹ Table "notifications" already exists or error:', err.message);
    }

    // Create order_status_history table if not exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_status_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          order_id INT NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Table "order_status_history" created');
    } catch (err) {
      console.log('ℹ Table "order_status_history" already exists or error:', err.message);
    }

    // Update existing orders to 'pending' status if they are 'completed'
    // This is optional - you may want to keep old orders as completed
    // Uncomment the next line if you want to update old orders
    // await connection.query("UPDATE orders SET status = 'pending' WHERE status = 'completed'");
    
    console.log('\n✅ Database update completed successfully!');
    await connection.end();

  } catch (error) {
    console.error('❌ Database update error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

updateDatabase();
