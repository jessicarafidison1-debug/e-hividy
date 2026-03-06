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

// View cart
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const connection = await db.getConnection();

    // Get cart items with product details
    const [cartItems] = await connection.query(`
      SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image
      FROM cart c
      INNER JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [userId]);

    // Calculate total
    let total = 0;
    cartItems.forEach(item => {
      item.subtotal = item.price * item.quantity;
      total += item.subtotal;
    });

    connection.release();

    res.render('cart', { cartItems, total, user: req.session.user });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).send('Erreur lors du chargement du panier');
  }
});

// Add item to cart
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Produit ou quantité invalide' });
    }

    const connection = await db.getConnection();

    // Check if product exists and has stock
    const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);

    if (products.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const product = products[0];

    // Check if requested quantity exceeds stock
    const [cartItems] = await connection.query(
      'SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    const currentQtyInCart = cartItems.length > 0 ? cartItems[0].quantity : 0;
    const totalQtyNeeded = currentQtyInCart + parseInt(quantity);

    if (totalQtyNeeded > product.stock) {
      connection.release();
      return res.status(400).json({ 
        error: `Seulement ${product.stock - currentQtyInCart} article(s) disponible(s) en stock` 
      });
    }

    if (currentQtyInCart > 0) {
      // Update quantity
      await connection.query(
        'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, userId, productId]
      );
    } else {
      // Add new item
      await connection.query(
        'INSERT INTO cart SET user_id = ?, product_id = ?, quantity = ?',
        [userId, productId, quantity]
      );
    }

    connection.release();
    res.json({ success: true, message: 'Produit ajouté au panier' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout au panier' });
  }
});

// Remove item from cart
router.post('/remove/:id', isAuthenticated, async (req, res) => {
  try {
    const cartId = req.params.id;
    const userId = req.session.user.id;

    const connection = await db.getConnection();
    
    // Verify item belongs to user
    const [items] = await connection.query(
      'SELECT id FROM cart WHERE id = ? AND user_id = ?',
      [cartId, userId]
    );

    if (items.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    // Delete item
    await connection.query('DELETE FROM cart WHERE id = ?', [cartId]);
    connection.release();

    res.json({ success: true, message: 'Article supprimé du panier' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du panier' });
  }
});

module.exports = router;

