const db = require('./config/db');

async function test() {
  try {
    const connection = await db.getConnection();
    console.log('DB connected');
    
    const [reports] = await connection.query('SELECT * FROM reports LIMIT 1');
    console.log('Reports:', reports);
    
    connection.release();
    console.log('Test OK');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
