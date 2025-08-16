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

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/auth', authRoutes);
app.use('/cars', carRoutes);
app.use('/coupons', couponRoutes);
app.use('/bookings', bookingRoutes);
app.use('/spinning-wheels', spinningWheelRoutes);

// Test endpoint to check database connection
app.get('/test', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM cars', (err, result) => {
    if (err) {
      console.error('Database test error:', err);
      return res.status(500).json({ error: 'Database connection failed: ' + err.message });
    }
    res.json({ success: true, message: 'Database connection working', carCount: result.count });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export the Express app for Vercel
module.exports = app; 