const cors = require('cors');

// CORS Configuration
const corsOptions = {
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  
  // Expose headers to client
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  
  // Preflight cache duration (in seconds)
  maxAge: 86400, // 24 hours
};

// Development origins (localhost)
const devOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080'
];

// Production origins (your actual domains)
const prodOrigins = [
  // Add your production domains here
  // 'https://yourdomain.com',
  // 'https://www.yourdomain.com',
  // 'https://rentaly.vercel.app',
  // 'https://your-vercel-domain.vercel.app'
];

// Vercel preview origins (for preview deployments)
const previewOrigins = [
  // Vercel automatically adds preview URLs
  // These will be dynamically added based on VERCEL_URL
];

// Get allowed origins based on environment
function getAllowedOrigins() {
  const origins = [...devOrigins];
  
  // Add production origins if in production
  if (process.env.NODE_ENV === 'production') {
    origins.push(...prodOrigins);
  }
  
  // Add Vercel preview URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // Add custom origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...customOrigins);
  }
  
  return origins;
}

// CORS origin validation function
function validateOrigin(origin, callback) {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (like mobile apps or Postman)
  if (!origin) {
    return callback(null, true);
  }
  
  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  
  // Check if origin matches Vercel preview pattern
  if (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL)) {
    return callback(null, true);
  }
  
  // Check if origin matches custom domain pattern
  if (process.env.CUSTOM_DOMAIN && origin.includes(process.env.CUSTOM_DOMAIN)) {
    return callback(null, true);
  }
  
  // Log blocked origins for debugging
  console.log(`🚫 CORS blocked origin: ${origin}`);
  console.log(`✅ Allowed origins:`, allowedOrigins);
  
  return callback(new Error('Not allowed by CORS'));
}

// Create CORS middleware with origin validation
const corsMiddleware = cors({
  ...corsOptions,
  origin: validateOrigin
});

// Strict CORS middleware (for production)
const strictCorsMiddleware = cors({
  ...corsOptions,
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
});

// Development CORS middleware (more permissive)
const devCorsMiddleware = cors({
  ...corsOptions,
  origin: true // Allow all origins in development
});

// Get appropriate CORS middleware based on environment
function getCorsMiddleware() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';
  
  if (isProduction || isVercel) {
    console.log('🔒 Using strict CORS for production');
    return strictCorsMiddleware;
  } else {
    console.log('🔓 Using permissive CORS for development');
    return devCorsMiddleware;
  }
}

// CORS preflight handler
const corsPreflight = (req, res) => {
  res.status(200).end();
};

// Export middleware and utilities
module.exports = {
  corsMiddleware: getCorsMiddleware(),
  strictCorsMiddleware,
  devCorsMiddleware,
  corsPreflight,
  getAllowedOrigins,
  validateOrigin
}; 