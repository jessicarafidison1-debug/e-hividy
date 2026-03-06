const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Input sanitization helper
const sanitizeInput = (str) => {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  
  try {
    const connection = await db.getConnection();
    const [results] = await connection.query('SELECT id FROM admins WHERE id = ?', [req.session.admin.id]);
    connection.release();
    
    if (results.length === 0) {
      req.session.destroy();
      return res.redirect('/admin/login');
    }
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.redirect('/admin/login');
  }
};

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { message: '' });
});

// Admin login handler
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('admin/login', { message: 'Veuillez fournir l\'email et le mot de passe' });
    }

    const connection = await db.getConnection();
    const [results] = await connection.query('SELECT * FROM admins WHERE email = ?', [email]);
    connection.release();

    if (results.length === 0) {
      return res.render('admin/login', { message: 'Identifiants invalides' });
    }

    const passwordMatch = await bcrypt.compare(password, results[0].password);
    
    if (!passwordMatch) {
      return res.render('admin/login', { message: 'Identifiants invalides' });
    }

    req.session.admin = {
      id: results[0].id,
      name: results[0].name,
      email: results[0].email
    };

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    res.render('admin/login', { message: 'Erreur lors de la connexion' });
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  // Only destroy admin session, keep user session if exists
  req.session.admin = null;
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    // Get stats
    const [orderStats] = await connection.query('SELECT COUNT(*) as total FROM orders');
    const [userStats] = await connection.query('SELECT COUNT(*) as total FROM users');
    const [productStats] = await connection.query('SELECT COUNT(*) as total FROM products');
    const [revenueStats] = await connection.query('SELECT SUM(total_amount) as total FROM orders');
    
    // Get recent orders
    const [recentOrders] = await connection.query(`
      SELECT o.id, o.total_amount, o.created_at, u.name as customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    
    connection.release();

    res.render('admin/dashboard', {
      admin: req.session.admin,
      stats: {
        totalOrders: orderStats[0].total,
        totalUsers: userStats[0].total,
        totalProducts: productStats[0].total,
        totalRevenue: revenueStats[0].total || 0
      },
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      admin: req.session.admin,
      stats: { totalOrders: 0, totalUsers: 0, totalProducts: 0, totalRevenue: 0 },
      recentOrders: [],
      error: 'Erreur lors du chargement du tableau de bord'
    });
  }
});

// Products list
router.get('/products', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [products] = await connection.query('SELECT * FROM products ORDER BY created_at DESC');
    connection.release();

    res.render('admin/products-list', {
      admin: req.session.admin,
      products
    });
  } catch (error) {
    console.error('Products list error:', error);
    res.render('admin/products-list', {
      admin: req.session.admin,
      products: [],
      error: 'Erreur lors du chargement des produits'
    });
  }
});

// Add product page
router.get('/products/add', isAdmin, (req, res) => {
  res.render('admin/product-form', {
    admin: req.session.admin,
    product: null,
    isEdit: false,
    message: ''
  });
});

// Create product
router.post('/products/add', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !description || !price || stock === '') {
      return res.render('admin/product-form', {
        admin: req.session.admin,
        product: { ...req.body, image: imagePath },
        isEdit: false,
        message: 'Tous les champs sont obligatoires'
      });
    }

    const connection = await db.getConnection();
    await connection.query(
      'INSERT INTO products (name, description, price, stock, image) VALUES (?, ?, ?, ?, ?)',
      [name, description, parseFloat(price), parseInt(stock), imagePath]
    );
    connection.release();

    res.redirect('/admin/products');
  } catch (error) {
    console.error('Create product error:', error);
    res.render('admin/product-form', {
      admin: req.session.admin,
      product: req.body,
      isEdit: false,
      message: error.message || 'Erreur lors de la création du produit'
    });
  }
});

// Edit product page
router.get('/products/edit/:id', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    connection.release();

    if (products.length === 0) {
      return res.redirect('/admin/products');
    }

    res.render('admin/product-form', {
      admin: req.session.admin,
      product: products[0],
      isEdit: true,
      message: ''
    });
  } catch (error) {
    console.error('Edit product error:', error);
    res.redirect('/admin/products');
  }
});

// Update product
router.post('/products/edit/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    let imagePath = null;

    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    if (!name || !description || !price || stock === '') {
      const connection = await db.getConnection();
      const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
      connection.release();

      return res.render('admin/product-form', {
        admin: req.session.admin,
        product: products[0],
        isEdit: true,
        message: 'Tous les champs sont obligatoires'
      });
    }

    const connection = await db.getConnection();
    if (imagePath) {
      await connection.query(
        'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image = ? WHERE id = ?',
        [name, description, parseFloat(price), parseInt(stock), imagePath, req.params.id]
      );
    } else {
      await connection.query(
        'UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ?',
        [name, description, parseFloat(price), parseInt(stock), req.params.id]
      );
    }
    connection.release();

    res.redirect('/admin/products');
  } catch (error) {
    console.error('Update product error:', error);
    res.redirect('/admin/products');
  }
});

// Delete product
router.post('/products/delete/:id', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    await connection.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    connection.release();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
  }
});

// Orders list
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [orders] = await connection.query(`
      SELECT o.*, u.name as customer_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    connection.release();

    res.render('admin/orders-list', {
      admin: req.session.admin,
      orders
    });
  } catch (error) {
    console.error('Orders list error:', error);
    res.render('admin/orders-list', {
      admin: req.session.admin,
      orders: [],
      error: 'Erreur lors du chargement des commandes'
    });
  }
});

// Order details
router.get('/orders/:id', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const [items] = await connection.query(`
      SELECT oi.*, p.name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);
    const [customer] = await connection.query('SELECT * FROM users WHERE id = ?', [orders[0].user_id]);
    connection.release();

    res.render('admin/order-details', {
      admin: req.session.admin,
      order: orders[0],
      items,
      customer: customer[0]
    });
  } catch (error) {
    console.error('Order details error:', error);
    res.redirect('/admin/orders');
  }
});

module.exports = router;

