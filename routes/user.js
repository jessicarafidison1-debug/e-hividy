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

// Get unread notification count middleware
const getNotificationCount = async (req, res, next) => {
  if (req.session.user) {
    try {
      const connection = await db.getConnection();
      const [result] = await connection.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [req.session.user.id]
      );
      res.locals.notificationCount = result[0].count;
      
      // Also get pending orders count for the user
      const [pendingOrders] = await connection.query(
        "SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'pending'",
        [req.session.user.id]
      );
      res.locals.pendingOrdersCount = pendingOrders[0].count;
      
      connection.release();
    } catch (error) {
      res.locals.notificationCount = 0;
      res.locals.pendingOrdersCount = 0;
    }
  } else {
    res.locals.notificationCount = 0;
    res.locals.pendingOrdersCount = 0;
  }
  next();
};

// Apply notification count to all user routes
router.use(getNotificationCount);

// API endpoint to get unread notification count
router.get('/api/notification-count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();
    const [result] = await connection.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    connection.release();
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Notification count error:', error);
    res.status(500).json({ count: 0 });
  }
});

// API endpoint to get latest notification for toast
router.get('/api/latest-notification', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();
    const [result] = await connection.query(
      `SELECT n.*, o.status as order_status 
       FROM notifications n
       LEFT JOIN orders o ON n.order_id = o.id
       WHERE n.user_id = ? AND n.is_read = FALSE
       ORDER BY n.created_at DESC
       LIMIT 1`,
      [userId]
    );
    connection.release();
    res.json({ success: true, notification: result[0] || null });
  } catch (error) {
    console.error('Latest notification error:', error);
    res.status(500).json({ success: false, notification: null });
  }
});

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

// Get notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();

    // Get all notifications for the user
    const [notifications] = await connection.query(`
      SELECT n.*, o.status as order_status
      FROM notifications n
      LEFT JOIN orders o ON n.order_id = o.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [userId]);

    // Mark all as read
    await connection.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    connection.release();
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();

    await connection.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    connection.release();
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de la notification' });
  }
});

// Cancel pending order (client can cancel their own pending orders)
router.post('/order/:id/cancel', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const orderId = req.params.id;
    const connection = await db.getConnection();

    // Get order details and verify it belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      connection.release();
      return res.status(400).json({ 
        success: false, 
        message: 'Seules les commandes en attente peuvent être annulées' 
      });
    }

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

    // Restore product stock
    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Create notification for the client
    const totalAmount = parseFloat(order.total_amount).toFixed(2);
    const notifTitle = 'Commande annulée';
    const notifMessage = 'Votre commande #' + orderId + ' a été annulée. Montant remboursé : Ar ' + totalAmount;
    await connection.query(
      'INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [userId, orderId, 'order_cancelled', notifTitle, notifMessage]
    );

    connection.release();
    res.json({ success: true, message: 'Commande annulée avec succès' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation de la commande' });
  }
});

// Get order status history
router.get('/order/:id/history', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const orderId = req.params.id;
    const connection = await db.getConnection();

    // Verify order belongs to user
    const [orders] = await connection.query(
      'SELECT id FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    // Get status history
    const [history] = await connection.query(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );

    connection.release();
    res.json({ success: true, history });
  } catch (error) {
    console.error('Order history error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique' });
  }
});

module.exports = router;

