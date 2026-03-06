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

// Checkout page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();

    // Get cart items
    const [cartItems] = await connection.query(`
      SELECT c.product_id, c.quantity, p.name, p.price, p.stock
      FROM cart c
      INNER JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [userId]);

    if (cartItems.length === 0) {
      connection.release();
      return res.redirect('/cart');
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        connection.release();
        return res.render('checkout', {
          cartItems: [],
          total: 0,
          shippingFee: 4000,
          user: req.session.user,
          message: `Désolé, ${item.name} est en rupture de stock`
        });
      }
    }

    // Calculate total (without shipping)
    let total = 0;
    cartItems.forEach(item => {
      total += item.price * item.quantity;
    });

    // Check if user is eligible for first-order discount (10%)
    const [userRows] = await connection.query(
      'SELECT first_order_discount_used FROM users WHERE id = ?',
      [userId]
    );
    const isFirstOrder = userRows.length > 0 && !userRows[0].first_order_discount_used;
    const discountPercent = isFirstOrder ? 10 : 0;
    const discountAmount = isFirstOrder ? total * 0.10 : 0;

    // Free shipping for orders >= 200000 Ar (after discount)
    const discountedTotal = total - discountAmount;
    const shippingFee = discountedTotal >= 200000 ? 0 : 4000;

    connection.release();

    res.render('checkout', {
      cartItems,
      total,
      discountPercent,
      discountAmount,
      shippingFee,
      user: req.session.user,
      message: '',
      isFirstOrder
    });
  } catch (error) {
    console.error('Error loading checkout:', error);
    res.status(500).send('Erreur lors du chargement de la page de paiement');
  }
});

// Place order
router.post('/place-order', isAuthenticated, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;
    const { address, city, state, zip, phone } = req.body;

    // Validation
    if (!address || !city || !state || !zip || !phone) {
      const [cartItems] = await connection.query(`
        SELECT c.product_id, c.quantity, p.name, p.price
        FROM cart c
        INNER JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
      `, [userId]);

      let total = 0;
      cartItems.forEach(item => {
        total += item.price * item.quantity;
      });

      // Check if user is eligible for first-order discount (10%)
      const [userRows] = await connection.query(
        'SELECT first_order_discount_used FROM users WHERE id = ?',
        [userId]
      );
      const isFirstOrder = userRows.length > 0 && !userRows[0].first_order_discount_used;
      const discountPercent = isFirstOrder ? 10 : 0;
      const discountAmount = isFirstOrder ? total * 0.10 : 0;

      connection.release();

      // Free shipping for orders >= 200000 Ar (after discount)
      const discountedTotal = total - discountAmount;
      const shippingFee = discountedTotal >= 200000 ? 0 : 4000;

      return res.render('checkout', {
        cartItems,
        total,
        discountPercent,
        discountAmount,
        shippingFee,
        user: req.session.user,
        message: 'Veuillez remplir tous les champs',
        isFirstOrder
      });
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      // Get cart items with stock info (lock rows for update)
      const [cartItems] = await connection.query(`
        SELECT c.id as cart_id, c.product_id, c.quantity, p.price, p.stock
        FROM cart c
        INNER JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        FOR UPDATE
      `, [userId]);

      if (cartItems.length === 0) {
        await connection.rollback();
        connection.release();
        return res.redirect('/cart');
      }

      // Verify stock availability for all items
      for (const item of cartItems) {
        if (item.quantity > item.stock) {
          await connection.rollback();
          connection.release();
          return res.render('checkout', {
            cartItems: [],
            total: 0,
            user: req.session.user,
            message: `Désolé, certains articles sont en rupture de stock`
          });
        }
      }

      // Calculate total
      let totalAmount = 0;
      cartItems.forEach(item => {
        totalAmount += item.price * item.quantity;
      });

      // Check if user is eligible for first-order discount (10%)
      const [userRows] = await connection.query(
        'SELECT first_order_discount_used FROM users WHERE id = ?',
        [userId]
      );
      const isFirstOrder = userRows.length > 0 && !userRows[0].first_order_discount_used;
      const discountPercent = isFirstOrder ? 10 : 0;
      const discountAmount = isFirstOrder ? totalAmount * 0.10 : 0;

      // Apply discount
      totalAmount -= discountAmount;

      // Free shipping for orders >= 200000 Ar (after discount)
      const shippingFee = totalAmount >= 200000 ? 0 : 4000;
      totalAmount += shippingFee;

      // Create order
      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_amount, status, address, city, state, zip, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, totalAmount, 'completed', address, city, state, zip, phone]
      );

      const orderId = orderResult.insertId;

      // Add order items and update stock
      for (const item of cartItems) {
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );

        // Update product stock
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Mark first-order discount as used if applicable
      if (isFirstOrder) {
        await connection.query(
          'UPDATE users SET first_order_discount_used = TRUE WHERE id = ?',
          [userId]
        );
      }

      // Clear cart
      await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

      // Commit transaction
      await connection.commit();
      connection.release();

      const discountMessage = isFirstOrder ? ' Réduction de 10% appliquée sur votre première commande !' : '';
      res.render('checkout', {
        cartItems: [],
        total: 0,
        user: req.session.user,
        message: `Commande passée avec succès ! Numéro de commande : ${orderId}.${discountMessage}`
      });
    } catch (transactionError) {
      // Rollback on error
      await connection.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error placing order:', error);
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (e) {}
    }
    res.status(500).send('Erreur lors de la passage de la commande');
  }
});

module.exports = router;

