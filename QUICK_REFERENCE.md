# Quick Reference Guide

## Getting Started

### 1. First Time Setup (Windows)
```bash
# Open PowerShell in project folder
npm install
npm run setup
npm start
```

### 2. Subsequent Runs
```bash
npm start              # Production mode
npm run dev           # Development with auto-reload
```

### 3. Database Reset
```bash
npm run setup         # Re-initializes database and tables
```

---

## Common URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Home - Product Listing |
| http://localhost:3000/auth/login-page | Login Page |
| http://localhost:3000/auth/register-page | Registration Page |
| http://localhost:3000/products | All Products |
| http://localhost:3000/products/:id | Product Details |
| http://localhost:3000/cart | Shopping Cart |
| http://localhost:3000/checkout | Checkout Page |

---

## Test Accounts

After running `npm run setup`, you can create test accounts:

**Example:**
- Email: test@example.com
- Password: password123

---

## API Endpoints Quick Reference

### Authentication
```
POST   /auth/register          Register new user
POST   /auth/login             Login user
GET    /auth/logout            Logout
GET    /auth/login-page        Show login form
GET    /auth/register-page     Show register form
```

### Products
```
GET    /products               List all products
GET    /products/:id           Get product details
```

### Cart
```
GET    /cart                   View cart (requires login)
POST   /cart/add               Add to cart (JSON body)
POST   /cart/remove/:id        Remove from cart
```

### Checkout
```
GET    /checkout               Show checkout form (requires login)
POST   /checkout/place-order   Place order (requires login)
```

---

## Request Body Examples

### Add to Cart
```json
{
  "productId": 1,
  "quantity": 2
}
```

### Register User
```
Form Data:
- name: John Doe
- email: john@example.com
- password: password123
- confirm: password123
```

### Login
```
Form Data:
- email: john@example.com
- password: password123
```

### Checkout
```
Form Data:
- address: 123 Main St
- city: Springfield
- state: IL
- zip: 62701
```

---

## Database Info

**Connection Details:**
- Host: localhost
- User: root
- Password: (empty)
- Database: shop
- Port: 3306

**Tables:**
1. users - User accounts
2. products - Product catalog
3. cart - Shopping cart items
4. orders - Order records
5. order_items - Items per order

---

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm install bcryptjs express-session
```

### MySQL Connection Failed
- Check XAMPP is running
- Verify MySQL service is active
- Confirm database 'shop' exists

### Port 3000 Already in Use
```bash
# Change PORT in server.js or use different port
set PORT=3001 && npm start
```

### Session Not Working
- Clear browser cookies
- Check server.js has sessionMiddleware configured
- Verify express-session is installed

---

## File Editing

### To Change Database Credentials
Edit: `config/db.js`
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shop'
});
```

### To Change Server Port
Edit: `server.js`
```javascript
const PORT = process.env.PORT || 3000;  // Change 3000 to desired port
```

### To Change Session Settings
Edit: `server.js`
```javascript
app.use(session({
  secret: 'your-secret-key',           // Change secret
  cookie: { maxAge: 1000 * 60 * 60 * 24 }  // Change timeout
}));
```

---

## File Structure Quick Lookup

| File | Purpose |
|------|---------|
| server.js | Main application setup |
| db-setup.js | Database initialization |
| config/db.js | DB connection config |
| routes/auth.js | Login/Register logic |
| routes/products.js | Product handling |
| routes/cart.js | Cart logic |
| routes/checkout.js | Order processing |
| views/*.ejs | HTML templates |
| public/style.css | Styling |

---

## Useful npm Commands

```bash
npm install              # Install all dependencies
npm install <package>    # Install specific package
npm start               # Start server
npm run dev             # Dev mode with auto-reload
npm run setup           # Initialize database
npm list                # Show installed packages
```

---

## PowerShell Useful Commands

```powershell
# Navigate to project
cd c:\xampp\htdocs\Myeva creation

# List files
dir

# Show file content
cat filename.js

# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Check Node.js version
node -v

# Check npm version
npm -v
```

---

## Development Tips

1. **Use `npm run dev`** for development to enable auto-reload
2. **Check console logs** in terminal for debugging
3. **Use browser DevTools** (F12) to inspect requests
4. **Test all routes** manually before deployment
5. **Clear browser cache** if CSS changes aren't visible
6. **Use prepared statements** for all database queries (already implemented)

---

## Browser Console Tips

When on a product page, you can test the add-to-cart API:
```javascript
fetch('/cart/add', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({productId: 1, quantity: 2})
}).then(r => r.json()).then(d => console.log(d))
```

---

**Need more help? Check README.md for detailed documentation.**
