const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirm } = req.body;

    // Validation
    if (!name || !email || !password || !confirm) {
      return res.status(400).render('register', { message: 'Veuillez remplir tous les champs' });
    }

    if (password !== confirm) {
      return res.status(400).render('register', { message: 'Les mots de passe ne correspondent pas' });
    }

    const connection = await db.getConnection();
    
    // Check if email exists
    const [results] = await connection.query('SELECT email FROM users WHERE email = ?', [email]);
    
    if (results.length > 0) {
      connection.release();
      return res.status(400).render('register', { message: 'Cet email est déjà utilisé' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Insert user
    await connection.query('INSERT INTO users SET ?', { name, email, password: hashedPassword });
    connection.release();

    res.status(201).render('register', { message: 'Utilisateur inscrit avec succès ! Veuillez vous connecter.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).render('register', { message: 'Erreur lors de l\'enregistrement' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render('login', { message: 'Veuillez fournir l\'email et le mot de passe' });
    }

    const connection = await db.getConnection();
    const [results] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    connection.release();

    if (results.length === 0) {
      return res.status(401).render('login', { message: 'Email ou mot de passe incorrects' });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, results[0].password);
    
    if (!passwordMatch) {
      return res.status(401).render('login', { message: 'Email ou mot de passe incorrects' });
    }

    // Store user in session
    req.session.user = {
      id: results[0].id,
      name: results[0].name,
      email: results[0].email
    };

    res.status(200).redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login', { message: 'Erreur lors de la connexion' });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  // Only destroy user session, keep admin session if exists
  req.session.user = null;
  res.redirect('/auth/login-page');
});

// Show login page
router.get('/login-page', (req, res) => {
  res.render('login', { message: '' });
});

// Show register page
router.get('/register-page', (req, res) => {
  res.render('register', { message: '' });
});

module.exports = router;

