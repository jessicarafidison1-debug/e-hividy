const mysql = require('mysql2/promise');

async function setupDatabase() {
  let connection;
  
  try {
    // Connect without database to create it
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS shop');
    console.log('Database created/exists');

    // Use the database
    await connection.query('USE shop');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created/exists');

    // Create products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        image VARCHAR(255),
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Products table created/exists');

    // Create cart table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('Cart table created/exists');

    // Create orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        zip VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Orders table created/exists');

    // Create order items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('Order items table created/exists');

    // Create admins table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Admins table created/exists');

    // Create wishlist table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_wish (user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('Wishlist table created/exists');

    // Create order status tracking table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
    console.log('Order status history table created/exists');

    // Insert sample products
    const [existingProducts] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (existingProducts[0].count === 0) {
      await connection.query(`
        INSERT INTO products (name, description, price, stock) VALUES
        ('Laptop', 'High-performance laptop for work and gaming', 999.99, 10),
        ('Smartphone', 'Latest smartphone with advanced features', 699.99, 15),
        ('Tablet', 'Portable tablet device', 499.99, 8),
        ('Headphones', 'Wireless noise-canceling headphones', 199.99, 20),
        ('Camera', 'Digital camera with 4K video', 549.99, 12),
        ('Monitor', '27-inch 4K monitor', 349.99, 6),
        ('Keyboard', 'Mechanical gaming keyboard', 129.99, 25),
        ('Mouse', 'Wireless ergonomic mouse', 79.99, 30),
        ('Webcam', 'HD webcam for streaming', 89.99, 18),
        ('Speaker', 'Portable Bluetooth speaker', 99.99, 14),
        ('Charger', 'Fast USB-C charger', 49.99, 40),
        ('Cable', 'High-speed HDMI cable', 19.99, 50)
      `);
      console.log('Sample products inserted');
    }

    // Insert sample admin user (email: admin@shop.com, password: admin123)
    const [existingAdmins] = await connection.query('SELECT COUNT(*) as count FROM admins');
    if (existingAdmins[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 8);
      await connection.query(
        'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
        ['Admin User', 'admin@shop.com', hashedPassword]
      );
      console.log('Sample admin user inserted (email: admin@shop.com, password: admin123)');
    }

    console.log('Database setup completed successfully!');
    await connection.end();
    
  } catch (error) {
    console.error('Database setup error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();

