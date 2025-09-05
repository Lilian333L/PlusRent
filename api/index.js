// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');

// Import custom CORS middleware
const { corsMiddleware } = require('../middleware/cors');

// Import Supabase client
const { supabase } = require('../lib/supabaseClient');

// Import routes
const authRoutes = require('../routes/auth');
const carRoutes = require('../routes/cars');
const couponRoutes = require('../routes/coupons');
const bookingRoutes = require('../routes/bookings');
const spinningWheelRoutes = require('../routes/spinning-wheels');
const feeSettingsRoutes = require('../routes/fee-settings');
const contactRoutes = require('../routes/contact');
const app = express();

// Middleware
app.use(corsMiddleware);

// Use urlencoded parser for form data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add JSON parser with increased limit
app.use(express.json({ limit: '50mb' }));

// Global request logger
app.use((req, res, next) => {
  next();
});

// Strip /api prefix from URL for Express routing
app.use((req, res, next) => {
  const originalUrl = req.url;
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '');
    // Handle root case
    if (req.url === '') {
      req.url = '/';
    }
  }
  next();
});

// Serve uploaded images
app.get('/uploads/*', (req, res) => {
  // Extract the file path from the URL
  const filePath = req.params[0];
  const fullPath = path.join(__dirname, '..', 'uploads', filePath);
  
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found', path: filePath });
  }
  
  // Get file stats
  const stats = fs.statSync(fullPath);
  
  // Set appropriate headers
  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Stream the file
  const fileStream = fs.createReadStream(fullPath);
  fileStream.pipe(res);
  
  fileStream.on('error', (error) => {
    console.error('❌ Error streaming file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error reading file' });
    }
  });
});

// Simple test route that doesn't use database
app.get('/simple-test', (req, res) => {
  res.json({
    message: 'Simple test route working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Try to mount routes with error handling
try {
  app.use('/auth', authRoutes);
} catch (error) {
  console.error('❌ Failed to mount auth routes:', error);
}

try {
  app.use('/cars', carRoutes);
} catch (error) {
  console.error('❌ Failed to mount car routes:', error);
}

try {
  app.use('/coupons', couponRoutes);
} catch (error) {
  console.error('❌ Failed to mount coupon routes:', error);
}

try {
  app.use('/bookings', bookingRoutes);
} catch (error) {
  console.error('❌ Failed to mount booking routes:', error);
}

try {
  app.use('/spinning-wheels', spinningWheelRoutes);
} catch (error) {
  console.error('❌ Failed to mount spinning wheel routes:', error);
}

try {
  app.use('/fee-settings', feeSettingsRoutes);
try {
  app.use('/contact', contactRoutes);
} catch (error) {
  console.error('❌ Failed to mount contact routes:', error);
} 
} catch (error) {
  console.error('❌ Failed to mount fee settings routes:', error);
}

// Note: Static file serving is handled by Vercel, not by the API

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('❌ API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to check database connection
app.get('/test', async (req, res) => {
  try {
    
    const { data, error, count } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database test error:', error);
      return res.status(500).json({ 
        error: 'Database connection failed: ' + error.message,
        debug: {
          supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not set',
          supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
          supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
        }
      });
    }
    
    res.json({ success: true, message: 'Database connection working', carCount: count });
  } catch (err) {
    console.error('Test endpoint error:', err);
    res.status(500).json({ error: 'Test endpoint failed: ' + err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
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
module.exports = app; 