const db = require('./config/db');
console.log('Type of db:', typeof db);
console.log('Is db.getConnection a function?', typeof db.getConnection === 'function');
console.log('Keys of db:', Object.keys(db));
process.exit(0);

