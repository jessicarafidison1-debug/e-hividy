require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database
const db = require('./config/db');

// Middleware to check if user is logged in
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  res.locals.search = req.query.search || '';
  // Default language for templates
  res.locals.lang = 'fr';
  app.locals.locale = 'fr-FR';
  next();
});

// Helper functions for views
app.locals.formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  
  return date.toLocaleDateString('fr-FR', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

app.locals.formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

app.locals.formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleDateString('fr-FR', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Test route
app.get('/test', (req, res) => {
  res.render('index', { products: [], user: null });
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/cart', require('./routes/cart'));
app.use('/checkout', require('./routes/checkout'));
app.use('/user', require('./routes/user'));
app.use('/admin', require('./routes/admin'));

// Home page with search and sort
app.get('/', async (req, res, next) => {
  try {
    const connection = await db.getConnection();
    const { search = '', sort = '' } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Search functionality
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sort functionality
    switch (sort) {
      case 'name-asc':
        query += ' ORDER BY name ASC';
        break;
      case 'name-desc':
        query += ' ORDER BY name DESC';
        break;
      case 'price-asc':
        query += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        query += ' ORDER BY price DESC';
        break;
      default:
        query += ' ORDER BY id DESC';
    }

    query += ' LIMIT 12';

    const [products] = await connection.query(query, params);
    connection.release();
    return res.render('index', { products, user: req.session.user || null, search });
  } catch (error) {
    console.error('Error in home route:', error.message, error.stack);
    try {
      return res.render('index', { products: [], user: req.session.user || null, search: '' });
    } catch (renderError) {
      console.error('Render error:', renderError);
      return res.status(500).send('Error loading page');
    }
  }
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).render('index', {
    products: [],
    user: req.session.user || null,
    search: '',
    message: 'Page not found'
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal server error');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

