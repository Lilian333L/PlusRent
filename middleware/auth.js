const jwt = require('jsonwebtoken');
const AdminUser = require('../models/admin');

// JWT secret key - use environment variable or default for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      if (err) {
        return res.status(403).json({ 
          error: 'Invalid or expired token',
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.'
        });
      }
    }

    try {
      // Verify user still exists in database
      const adminUser = await AdminUser.findById(user.id);
      if (!adminUser) {
        return res.status(403).json({ error: 'User no longer exists' });
      }

      req.user = {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email
      };
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authentication error' });
    }
  });
};

// Middleware to check if user is admin (for session-based auth)
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  JWT_SECRET
}; 