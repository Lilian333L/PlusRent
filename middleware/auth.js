const jwt = require('jsonwebtoken');
const AdminUser = require('../models/admin');

// JWT secret key - use environment variable or default for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// "Sign out every device" (admin agenda, 1 Oct 2026): tokens issued before the
// moment stored in global_settings are refused. Read at most once a minute.
let validAfter = { value: null, at: 0 };
async function getValidAfter() {
  if (Date.now() - validAfter.at < 60 * 1000) return validAfter.value;
  try {
    const { supabaseAdmin } = require('../lib/supabaseClient');
    const { data } = await supabaseAdmin
      .from('global_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_tokens_valid_after')
      .maybeSingle();
    const t = data && Date.parse(data.setting_value);
    validAfter = { value: Number.isFinite(t) ? t : null, at: Date.now() };
  } catch (e) {
    // a failed read never locks the owner out
    validAfter = { value: validAfter.value, at: Date.now() };
  }
  return validAfter.value;
}
function forgetValidAfter() { validAfter = { value: null, at: 0 }; }

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
      const after = await getValidAfter();
      if (after && user.iat && user.iat * 1000 < after) {
        return res.status(403).json({
          error: 'Invalid or expired token',
          code: 'TOKEN_EXPIRED',
          message: 'You were signed out on every device. Please log in again.'
        });
      }

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

// Generate JWT token: 24 h, or 90 days when "remember this device" is ticked
const generateToken = (user, remember) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: remember ? '90d' : '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  forgetValidAfter,
  JWT_SECRET
}; 