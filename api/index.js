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

// Custom body parser for Vercel compatibility
app.use((req, res, next) => {
  if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(data);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// Only use urlencoded parser for non-JSON requests
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

// Simple test route that doesn't use database
app.get('/simple-test', (req, res) => {
  console.log('✅ Simple test route called');
  res.json({
    message: 'Simple test route working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Try to mount routes with error handling
try {
  console.log('🔧 Mounting auth routes...');
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes mounted');
} catch (error) {
  console.error('❌ Failed to mount auth routes:', error);
}

try {
  console.log('🔧 Mounting car routes...');
  app.use('/cars', carRoutes);
  console.log('✅ Car routes mounted');
} catch (error) {
  console.error('❌ Failed to mount car routes:', error);
}

try {
  console.log('🔧 Mounting coupon routes...');
  app.use('/coupons', couponRoutes);
  console.log('✅ Coupon routes mounted');
} catch (error) {
  console.error('❌ Failed to mount coupon routes:', error);
}

try {
  console.log('🔧 Mounting booking routes...');
  app.use('/bookings', bookingRoutes);
  console.log('✅ Booking routes mounted');
} catch (error) {
  console.error('❌ Failed to mount booking routes:', error);
}

try {
  console.log('🔧 Mounting spinning wheel routes...');
  app.use('/spinning-wheels', spinningWheelRoutes);
  console.log('✅ Spinning wheel routes mounted');
} catch (error) {
  console.error('❌ Failed to mount spinning wheel routes:', error);
}

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

// Root endpoint to verify the function is working
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: [
      '/',
      '/health',
      '/test',
      '/simple-test',
      '/cars',
      '/auth',
      '/coupons',
      '/bookings',
      '/spinning-wheels'
    ]
  });
});

// Also handle /api path (what Vercel sends)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: [
      '/health',
      '/test',
      '/simple-test',
      '/cars',
      '/auth',
      '/coupons',
      '/bookings',
      '/spinning-wheels'
    ]
  });
});

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/',
      '/health',
      '/test',
      '/simple-test',
      '/cars',
      '/auth',
      '/coupons',
      '/bookings',
      '/spinning-wheels'
    ],
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel serverless function
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Strip /api prefix from URL for Express routing
  const originalUrl = req.url;
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '');
    // Handle root case
    if (req.url === '') {
      req.url = '/';
    }
  }
  
  console.log('🌐 Original URL:', originalUrl, '-> Express URL:', req.url);
  
  // Call the Express app
  return app(req, res);
}; 