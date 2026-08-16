const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../utils/jwt');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const users = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      error: error.message
    });
  }
}

async function getMe(req, res) {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve current user info.',
      error: error.message
    });
  }
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), password_hash, userRole]
    );

    const token = generateToken({
      id: result.insertId,
      email: email.trim().toLowerCase(),
      role: userRole,
      name: name.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: result.insertId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: userRole
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'User registration failed.',
      error: error.message
    });
  }
}

async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

module.exports = {
  login,
  getMe,
  register,
  logout
};
