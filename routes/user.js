const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login-page');
  }
  next();
};

// User account page
router.get('/account', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();

    // Get user details
    const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);

    // Get user orders
    const [orders] = await connection.query(`
      SELECT o.* FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    // Get user wishlist count
    const [wishlistCount] = await connection.query(`
      SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?
    `, [userId]);

    // Get user wishlist items
    const [wishlistItems] = await connection.query(`
      SELECT w.id as wish_id, p.*
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId]);

    connection.release();

    res.render('account', {
      user: req.session.user,
      userDetails: users[0],
      orders,
      wishlistCount: wishlistCount[0].count,
      wishlistItems
    });
  } catch (error) {
    console.error('Account page error:', error);
    res.render('account', {
      user: req.session.user,
      userDetails: req.session.user,
      orders: [],
      wishlistCount: 0,
      wishlistItems: [],
      error: 'Erreur lors du chargement des informations du compte'
    });
  }
});

// Order details page
router.get('/order/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const orderId = req.params.id;
    const connection = await db.getConnection();

    // Get order (verify it belongs to user)
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      connection.release();
      return res.status(404).send('Commande non trouvée');
    }

    // Get order items
    const [items] = await connection.query(`
      SELECT oi.*, p.name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    connection.release();

    res.render('order-details', {
      user: req.session.user,
      order: orders[0],
      items
    });
  } catch (error) {
    console.error('Order details error:', error);
    res.status(500).send('Erreur lors du chargement de la commande');
  }
});

// Wishlist page redirect to account tab
router.get('/wishlist', isAuthenticated, (req, res) => {
  res.redirect('/user/account?tab=wishlist');
});

// Add to wishlist
router.post('/wishlist/add', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'ID produit requis' });
    }

    const connection = await db.getConnection();

    // Check if already in wishlist
    const [existing] = await connection.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Déjà dans la liste de souhaits' });
    }

    // Add to wishlist
    await connection.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );

    connection.release();
    res.json({ success: true, message: 'Ajouté à la liste de souhaits' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout à la liste de souhaits' });
  }
});

// Remove from wishlist
router.post('/wishlist/remove/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const wishId = req.params.id;

    const connection = await db.getConnection();

    // Verify wishlist item belongs to user
    const [items] = await connection.query(
      'SELECT id FROM wishlist WHERE id = ? AND user_id = ?',
      [wishId, userId]
    );

    if (items.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    // Remove from wishlist
    await connection.query('DELETE FROM wishlist WHERE id = ?', [wishId]);
    connection.release();

    res.json({ success: true, message: 'Supprimé de la liste de souhaits' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la liste de souhaits' });
  }
});

module.exports = router;

