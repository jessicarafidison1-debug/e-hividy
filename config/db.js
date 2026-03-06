require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on module load
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected!');
    conn.release();
    return true;
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    console.log('Make sure XAMPP MySQL is running on localhost:3306');
    return false;
  }
};

// Attempt connection
testConnection();

module.exports = pool;

