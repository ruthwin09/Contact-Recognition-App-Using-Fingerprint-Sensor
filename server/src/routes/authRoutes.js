const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateLogin } = require('../middleware/validate');

router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
