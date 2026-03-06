const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all products with search and sort
router.get('/', async (req, res) => {
  try {
    const { search = '', sort = '' } = req.query;
    const connection = await db.getConnection();
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    switch (sort) {
      case 'name-asc': query += ' ORDER BY name ASC'; break;
      case 'name-desc': query += ' ORDER BY name DESC'; break;
      case 'price-asc': query += ' ORDER BY price ASC'; break;
      case 'price-desc': query += ' ORDER BY price DESC'; break;
      default: query += ' ORDER BY id DESC';
    }

    const [products] = await connection.query(query, params);
    connection.release();
    
    res.render('index', { products, user: req.session.user || null, search });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).render('index', { products: [], user: req.session.user || null, search: '' });
  }
});

// Get product details
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    const connection = await db.getConnection();
    const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
    connection.release();

    if (products.length === 0) {
      return res.status(404).send('Produit non trouvé');
    }

    res.render('product', { product: products[0], user: req.session.user || null });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).send('Erreur lors du chargement du produit');
  }
});

module.exports = router;

