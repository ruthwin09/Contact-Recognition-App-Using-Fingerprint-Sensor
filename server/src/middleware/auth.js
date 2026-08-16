const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or token invalid. Please log in again.'
      });
    }

    // Verify user still exists in database
    const users = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed.',
      error: error.message
    });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (req.user.role !== role && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires ${role} privileges.`
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin: requireRole('ADMIN')
};
