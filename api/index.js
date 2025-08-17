const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database configuration
const db = require('../config/database');

// Import routes
const authRoutes = require('../routes/auth');
const carRoutes = require('../routes/cars');
const couponRoutes = require('../routes/coupons');
const bookingRoutes = require('../routes/bookings');
const spinningWheelRoutes = require('../routes/spinning-wheels');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global request logger
app.use((req, res, next) => {
  console.log('🌐 REQUEST:', req.method, req.originalUrl);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes - mount them properly
app.use('/auth', authRoutes);
app.use('/cars', carRoutes);
app.use('/coupons', couponRoutes);
app.use('/bookings', bookingRoutes);
app.use('/spinning-wheels', spinningWheelRoutes);

// Test endpoint to check database connection
app.get('/test', (req, res) => {
  try {
    console.log('Testing database connection...');
    db.get('SELECT COUNT(*) as count FROM cars', (err, result) => {
      if (err) {
        console.error('Database test error:', err);
        return res.status(500).json({ error: 'Database connection failed: ' + err.message });
      }
      console.log('Database test successful:', result);
      res.json({ success: true, message: 'Database connection working', carCount: result.count });
    });
  } catch (err) {
    console.error('Test endpoint error:', err);
    res.status(500).json({ error: 'Test endpoint failed: ' + err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    console.log('Health check requested');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Export the Express app for Vercel
module.exports = app; 