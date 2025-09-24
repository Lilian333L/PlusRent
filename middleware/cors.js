const cors = require('cors');

// Development CORS Configuration - PERMISSIVE FOR DEVELOPMENT
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

// Get allowed origins based on environment
function getAllowedOrigins() {
  const origins = [...devOrigins];
  
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

// CORS origin validation function - PERMISSIVE FOR DEVELOPMENT
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
  
  // For development, be permissive - allow all origins

  return callback(null, true);
}

// Create CORS middleware with origin validation
const corsMiddleware = cors({
  ...corsOptions,
  origin: validateOrigin
});

// Development CORS middleware (completely permissive)
const devCorsMiddleware = cors({
  ...corsOptions,
  origin: true // Allow all origins in development
}); 

// Get appropriate CORS middleware based on environment
function getCorsMiddleware() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';
  
  if (isProduction) {
    return corsMiddleware;
  } else {
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
  devCorsMiddleware,
  corsPreflight,
  getAllowedOrigins,
  validateOrigin
}; 