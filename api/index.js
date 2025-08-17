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

// API Routes with error handling
app.use('/auth', (req, res, next) => {
  try {
    authRoutes(req, res, next);
  } catch (err) {
    console.error('Auth route error:', err);
    res.status(500).json({ error: 'Auth route failed' });
  }
});

app.use('/cars', (req, res, next) => {
  try {
    carRoutes(req, res, next);
  } catch (err) {
    console.error('Cars route error:', err);
    res.status(500).json({ error: 'Cars route failed' });
  }
});

app.use('/coupons', (req, res, next) => {
  try {
    couponRoutes(req, res, next);
  } catch (err) {
    console.error('Coupons route error:', err);
    res.status(500).json({ error: 'Coupons route failed' });
  }
});

app.use('/bookings', (req, res, next) => {
  try {
    bookingRoutes(req, res, next);
  } catch (err) {
    console.error('Bookings route error:', err);
    res.status(500).json({ error: 'Bookings route failed' });
  }
});

app.use('/spinning-wheels', (req, res, next) => {
  try {
    spinningWheelRoutes(req, res, next);
  } catch (err) {
    console.error('Spinning wheels route error:', err);
    res.status(500).json({ error: 'Spinning wheels route failed' });
  }
});

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