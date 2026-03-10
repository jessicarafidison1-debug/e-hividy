const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'myeva_creation'
});

connection.connect(async (err) => {
  if (err) {
    console.error('Erreur de connexion:', err);
    return;
  }

  console.log('Connecté à la base de données');

  try {
    // Create reports table
    await connection.promise().query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_type VARCHAR(50) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT DEFAULT 0,
        generated_by INT DEFAULT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        downloaded_at TIMESTAMP NULL,
        INDEX (report_type),
        INDEX (generated_at),
        INDEX (generated_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table "reports" créée avec succès');
  } catch (error) {
    console.error('Erreur lors de la création de la table:', error);
  } finally {
    connection.end();
  }
});
