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

// Approve order
router.post('/orders/:id/approve', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const orderId = req.params.id;

    // Get order details
    const [orders] = await connection.query('SELECT user_id, total_amount FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    const userId = orders[0].user_id;
    const totalAmount = parseFloat(orders[0].total_amount).toFixed(2);

    // Update order status to completed
    await connection.query(
      "UPDATE orders SET status = 'completed' WHERE id = ?",
      [orderId]
    );

    // Record status change in history
    await connection.query(
      'INSERT INTO order_status_history (order_id, status) VALUES (?, ?)',
      [orderId, 'completed']
    );

    // Create notification for the client
    const notifTitle = 'Commande validée';
    const notifMessage = 'Votre commande #' + orderId + ' a été validée avec succès. Montant total : Ar ' + totalAmount;
    await connection.query(
      'INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [userId, orderId, 'order_approved', notifTitle, notifMessage]
    );

    connection.release();
    res.json({ success: true, message: 'Commande validée avec succès' });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la validation de la commande' });
  }
});

// Cancel order
router.post('/orders/:id/cancel', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const orderId = req.params.id;

    // Get order details
    const [orders] = await connection.query('SELECT user_id, total_amount FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    const userId = orders[0].user_id;
    const totalAmount = parseFloat(orders[0].total_amount).toFixed(2);

    // Get order items to restore stock
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );

    // Update order status to cancelled
    await connection.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = ?",
      [orderId]
    );

    // Record status change in history
    await connection.query(
      'INSERT INTO order_status_history (order_id, status) VALUES (?, ?)',
      [orderId, 'cancelled']
    );

    // Create notification for the client
    const notifTitle = 'Commande annulée';
    const notifMessage = 'Votre commande #' + orderId + ' a été annulée. Montant remboursé : Ar ' + totalAmount;
    await connection.query(
      'INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [userId, orderId, 'order_cancelled', notifTitle, notifMessage]
    );

    // Restore product stock
    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    connection.release();
    res.json({ success: true, message: 'Commande annulée avec succès' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation de la commande' });
  }
});

// ============================================
// PDF Export Routes
// ============================================
const { generatePDF } = require('../utils/pdfGenerator');

// Export Dashboard to PDF
router.get('/export/dashboard.pdf', isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();

    // Get stats
    const [revenueResult] = await connection.query('SELECT IFNULL(SUM(total_amount), 0) as total FROM orders WHERE status = "completed"');
    const [ordersResult] = await connection.query('SELECT COUNT(*) as count FROM orders');
    const [usersResult] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [productsResult] = await connection.query('SELECT COUNT(*) as count FROM products');
    const [recentOrders] = await connection.query(`
      SELECT o.*, u.name as customer_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    const stats = {
      totalRevenue: revenueResult[0].total,
      totalOrders: ordersResult[0].count,
      totalUsers: usersResult[0].count,
      totalProducts: productsResult[0].count
    };

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Tableau de bord - Myeva Creation</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
          h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #f9fafb; }
          .stat-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; }
          .stat-card .number { font-size: 28px; font-weight: 700; color: #111827; }
          .stat-card .change { color: #059669; font-size: 12px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-processing { background: #dbeafe; color: #1e40af; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 Tableau de bord - Myeva Creation</h1>
        <p>Date du rapport: ${new Date().toLocaleDateString('fr-FR')}</p>
        
        <h2>Statistiques générales</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Revenu total</h3>
            <div class="number">Ar${parseFloat(stats.totalRevenue).toLocaleString('fr-FR', {minimumFractionDigits: 2})}</div>
            <div class="change">✓ Généré de tout temps</div>
          </div>
          <div class="stat-card">
            <h3>Commandes totales</h3>
            <div class="number">${stats.totalOrders.toLocaleString('fr-FR')}</div>
            <div class="change">📦 Commandes en tout temps</div>
          </div>
          <div class="stat-card">
            <h3>Clients totaux</h3>
            <div class="number">${stats.totalUsers.toLocaleString('fr-FR')}</div>
            <div class="change">👥 Utilisateurs inscrits</div>
          </div>
          <div class="stat-card">
            <h3>Produits totaux</h3>
            <div class="number">${stats.totalProducts.toLocaleString('fr-FR')}</div>
            <div class="change">📦 Dans le catalogue</div>
          </div>
        </div>

        <h2>Dernières commandes</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${recentOrders.map(o => `
              <tr>
                <td>#${o.id}</td>
                <td>${o.customer_name || 'N/A'}</td>
                <td>Ar${parseFloat(o.total_amount).toFixed(2)}</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Myeva Creation - Rapport généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;

    const { buffer: pdfBuffer, filename, filepath } = await generatePDF(html, 'Tableau de bord', true);
    
    // Save to database
    const dateStr = new Date().toISOString().split('T')[0];
    const originalName = `dashboard-${dateStr}.pdf`;
    
    await connection.query(
      `INSERT INTO reports (report_type, filename, original_name, file_path, file_size, generated_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['dashboard', filename, originalName, filepath.replace(path.join(__dirname, '..'), ''), pdfBuffer.length, req.session.admin.id]
    );

    connection.release();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Dashboard PDF export error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, message: 'Erreur lors de l\'export PDF: ' + error.message });
  }
});

// Export Products to PDF
router.get('/export/products.pdf', isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [products] = await connection.query('SELECT * FROM products ORDER BY created_at DESC');

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Produits - Myeva Creation</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
          h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .stock-ok { color: #059669; font-weight: 600; }
          .stock-low { color: #d97706; font-weight: 600; }
          .stock-out { color: #dc2626; font-weight: 600; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .summary-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; background: #f9fafb; }
          .summary-item .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .summary-item .value { font-size: 24px; font-weight: 700; color: #111827; margin-top: 5px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📦 Produits - Myeva Creation</h1>
        <p>Date du rapport: ${new Date().toLocaleDateString('fr-FR')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="label">Produits totaux</div>
            <div class="value">${products.length}</div>
          </div>
          <div class="summary-item">
            <div class="label">En stock</div>
            <div class="value stock-ok">${products.filter(p => p.stock > 10).length}</div>
          </div>
          <div class="summary-item">
            <div class="label">Stock faible</div>
            <div class="value stock-low">${products.filter(p => p.stock > 0 && p.stock <= 10).length}</div>
          </div>
          <div class="summary-item">
            <div class="label">Indisponible</div>
            <div class="value stock-out">${products.filter(p => p.stock === 0).length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>#${p.id}</td>
                <td>${p.name}</td>
                <td>Ar${parseFloat(p.price).toLocaleString('fr-FR', {minimumFractionDigits: 2})}</td>
                <td class="${p.stock === 0 ? 'stock-out' : p.stock <= 10 ? 'stock-low' : 'stock-ok'}">${p.stock}</td>
                <td>
                  ${p.stock === 0 ? '<span class="stock-out">Indisponible</span>' : 
                    p.stock <= 10 ? '<span class="stock-low">Stock faible</span>' : 
                    '<span class="stock-ok">En stock</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Myeva Creation - Rapport généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;

    const { buffer: pdfBuffer, filename, filepath } = await generatePDF(html, 'Produits', true);
    
    // Save to database
    const dateStr = new Date().toISOString().split('T')[0];
    const originalName = `produits-${dateStr}.pdf`;
    
    await connection.query(
      `INSERT INTO reports (report_type, filename, original_name, file_path, file_size, generated_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['products', filename, originalName, filepath.replace(path.join(__dirname, '..'), ''), pdfBuffer.length, req.session.admin.id]
    );

    connection.release();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Products PDF export error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, message: 'Erreur lors de l\'export PDF: ' + error.message });
  }
});

// Export Orders to PDF
router.get('/export/orders.pdf', isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [orders] = await connection.query(`
      SELECT o.*, u.name as customer_name, u.email, u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Commandes - Myeva Creation</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
          h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-processing { background: #dbeafe; color: #1e40af; }
          .status-shipped { background: #e0e7ff; color: #3730a3; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .status-failed { background: #fee2e2; color: #991b1b; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .summary-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; background: #f9fafb; }
          .summary-item .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .summary-item .value { font-size: 24px; font-weight: 700; color: #111827; margin-top: 5px; }
          .summary-item.highlight { background: #f0fff4; border-color: #10b981; }
          .summary-item.highlight .value { color: #059669; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📋 Commandes - Myeva Creation</h1>
        <p>Date du rapport: ${new Date().toLocaleDateString('fr-FR')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="label">Commandes totales</div>
            <div class="value">${orders.length}</div>
          </div>
          <div class="summary-item">
            <div class="label">Completées</div>
            <div class="value">${orders.filter(o => o.status === 'completed').length}</div>
          </div>
          <div class="summary-item">
            <div class="label">En attente</div>
            <div class="value">${orders.filter(o => o.status === 'pending').length}</div>
          </div>
          <div class="summary-item highlight">
            <div class="label">Revenu total</div>
            <div class="value">Ar${orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0).toFixed(2)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td>#${o.id}</td>
                <td>${o.customer_name || 'N/A'}</td>
                <td>${o.email || 'N/A'}</td>
                <td>${o.phone || 'N/A'}</td>
                <td>Ar${parseFloat(o.total_amount).toFixed(2)}</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Myeva Creation - Rapport généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;

    const { buffer: pdfBuffer, filename, filepath } = await generatePDF(html, 'Commandes', true);
    
    // Save to database
    const dateStr = new Date().toISOString().split('T')[0];
    const originalName = `commandes-${dateStr}.pdf`;
    
    await connection.query(
      `INSERT INTO reports (report_type, filename, original_name, file_path, file_size, generated_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['orders', filename, originalName, filepath.replace(path.join(__dirname, '..'), ''), pdfBuffer.length, req.session.admin.id]
    );

    connection.release();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Orders PDF export error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, message: 'Erreur lors de l\'export PDF: ' + error.message });
  }
});

// Reports list page
router.get('/reports', isAdmin, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [reports] = await connection.query(`
      SELECT r.*, a.name as generated_by_name
      FROM reports r
      LEFT JOIN admins a ON r.generated_by = a.id
      ORDER BY r.generated_at DESC
      LIMIT 50
    `);
    connection.release();

    console.log('Reports found:', reports.length);
    res.render('admin/reports-list', { reports, activePage: 'reports' });
  } catch (error) {
    console.error('Reports list error:', error);
    console.error('Stack:', error.stack);
    res.status(500).send('Erreur lors du chargement des rapports: ' + error.message);
  }
});

// Download report
router.get('/reports/download/:id', isAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const connection = await db.getConnection();
    
    const [reports] = await connection.query('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Rapport non trouvé' });
    }
    
    const report = reports[0];
    
    // Update downloaded_at
    await connection.query('UPDATE reports SET downloaded_at = NOW() WHERE id = ?', [reportId]);
    connection.release();
    
    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.original_name}"`);
    res.sendFile(report.filepath, { root: path.join(__dirname, '..') });
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du téléchargement' });
  }
});

// View report in browser
router.get('/reports/view/:id', isAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const connection = await db.getConnection();
    
    const [reports] = await connection.query('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Rapport non trouvé' });
    }
    
    const report = reports[0];
    
    // Update downloaded_at
    await connection.query('UPDATE reports SET downloaded_at = NOW() WHERE id = ?', [reportId]);
    connection.release();
    
    // Send file inline (display in browser)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.original_name}"`);
    res.sendFile(report.filepath, { root: path.join(__dirname, '..') });
  } catch (error) {
    console.error('View report error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'affichage' });
  }
});

// Delete report
router.post('/reports/delete/:id', isAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const connection = await db.getConnection();
    
    const [reports] = await connection.query('SELECT * FROM reports WHERE id = ?', [reportId]);
    
    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Rapport non trouvé' });
    }
    
    const report = reports[0];
    
    // Delete file
    const fs = require('fs');
    if (fs.existsSync(report.filepath)) {
      fs.unlinkSync(report.filepath);
    }
    
    // Delete from database
    await connection.query('DELETE FROM reports WHERE id = ?', [reportId]);
    connection.release();
    
    res.json({ success: true, message: 'Rapport supprimé avec succès' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

module.exports = router;

