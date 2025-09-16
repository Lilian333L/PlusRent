const cors = require('cors');

// Production CORS Configuration - STRICT SECURITY
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

// Production origins - UPDATE THESE WITH YOUR ACTUAL DOMAINS
const productionOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://plusrent.vercel.app',
  // Add your other production domains here
];

// Get allowed origins for production
function getAllowedOrigins() {
  const origins = [...productionOrigins];
  
  // Add custom origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...customOrigins);
  }
  
  return origins;
}

// CORS origin validation function - STRICT FOR PRODUCTION
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
  

  return callback(new Error('Not allowed by CORS'));
}

// Create CORS middleware with origin validation
const corsMiddleware = cors({
  ...corsOptions,
  origin: validateOrigin
});

// Production CORS middleware (strict)
const productionCorsMiddleware = cors({
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

// Get appropriate CORS middleware based on environment
function getCorsMiddleware() {
  
  return productionCorsMiddleware;
}

// CORS preflight handler
const corsPreflight = (req, res) => {
  res.status(200).end();
};

// Export middleware and utilities
module.exports = {
  corsMiddleware: getCorsMiddleware(),
  productionCorsMiddleware,
  corsPreflight,
  getAllowedOrigins,
  validateOrigin
}; 