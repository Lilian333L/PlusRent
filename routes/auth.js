const express = require('express');
const router = express.Router();
const AdminUser = require('../models/admin');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find admin user
    const adminUser = await AdminUser.findByUsername(username);
    if (!adminUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await AdminUser.verifyPassword(password, adminUser.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    try {
      await AdminUser.updateLastLogin(adminUser.id);
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Continue with login even if update fails
    }

    // Generate JWT token
    const token = generateToken(adminUser);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin logout
router.post('/logout', authenticateToken, (req, res) => {
  // For JWT, logout is handled client-side by removing the token
  res.json({ success: true, message: 'Logout successful' });
});

// Get current admin user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const adminUser = await AdminUser.findById(req.user.id);
    if (!adminUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        created_at: adminUser.created_at,
        last_login: adminUser.last_login
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Database health check endpoint
router.get('/health', async (req, res) => {
  try {
    const db = require('../config/database');
    
    // Test basic read operation
    db.get('SELECT 1 as test', (err, row) => {
      if (err) {
        console.error('Database read test failed:', err);
        return res.status(503).json({ 
          status: 'unhealthy',
          error: 'Database read failed',
          details: err.message
        });
      }
      
      // Test write operation
      db.run('CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY)', (err) => {
        if (err) {
          console.error('Database write test failed:', err);
          return res.status(503).json({ 
            status: 'unhealthy',
            error: 'Database write failed',
            details: err.message
          });
        }
        
        // Clean up test table
        db.run('DROP TABLE IF EXISTS health_check', (err) => {
          if (err) {
            console.error('Database cleanup failed:', err);
          }
          
          res.json({ 
            status: 'healthy',
            message: 'Database is working correctly',
            timestamp: new Date().toISOString()
          });
        });
      });
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Create new admin user (protected route)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUser = await AdminUser.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new admin user
    const newUser = await AdminUser.create(username, password, email);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Get all admin users (protected route)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await AdminUser.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Delete admin user (protected route)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await AdminUser.delete(userId);
    
    if (result.deletedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

module.exports = router; 