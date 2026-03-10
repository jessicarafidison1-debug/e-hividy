const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'views', 'checkout.ejs');
const template = fs.readFileSync(templatePath, 'utf8');

try {
  ejs.compile(template);
  console.log('✅ EJS template compiles successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ EJS compilation error:', error.message);
  process.exit(1);
}
