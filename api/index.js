// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import Supabase client
const { supabase } = require('../lib/supabaseClient');

// Import routes
const authRoutes = require('../routes/auth');
const carRoutes = require('../routes/cars');
const couponRoutes = require('../routes/coupons');
const bookingRoutes = require('../routes/bookings');
const spinningWheelRoutes = require('../routes/spinning-wheels');

const app = express();

// Middleware
app.use(cors());

// Use urlencoded parser for form data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add JSON parser with increased limit
app.use(express.json({ limit: '50mb' }));

// Global request logger
app.use((req, res, next) => {
  console.log('🌐 REQUEST:', req.method, req.originalUrl);
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
  console.log('🌐 Original URL:', originalUrl, '-> Express URL:', req.url);
  next();
});

// Serve uploaded images
app.get('/uploads/*', (req, res) => {
  // Extract the file path from the URL
  const filePath = req.params[0];
  const fullPath = path.join(__dirname, '..', 'uploads', filePath);
  
  console.log('📁 Serving file:', filePath);
  console.log('📁 Full path:', fullPath);
  
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    console.log('❌ File not found:', fullPath);
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
    console.log('Testing Supabase connection...');
    
    // Debug environment variables
    console.log('Environment variables in /test:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
    
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
    
    console.log('Database test successful, car count:', count);
    res.json({ success: true, message: 'Database connection working', carCount: count });
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
module.exports = app; 