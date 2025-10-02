// Content Security Policy (CSP) Middleware
// This helps prevent XSS attacks and improves security

const helmet = require('helmet');

// CSP configuration for production
const cspConfig = {
  directives: {
    // Default source - allow same origin
    defaultSrc: ["'self'"],
    
    // Script sources - allow inline scripts with nonce, external CDNs
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline scripts (consider removing in future)
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
      "https://code.jquery.com",
      "https://stackpath.bootstrapcdn.com",
      "https://unpkg.com"
    ],
    
    // Style sources - allow inline styles and external CDNs
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
      "https://fonts.googleapis.com",
      "https://stackpath.bootstrapcdn.com"
    ],
    
    // Font sources - allow Google Fonts and CDN fonts
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com",
      "data:" // Allow data URIs for fonts
    ],
    
    // Image sources - allow images from various sources
    imgSrc: [
      "'self'",
      "data:", // Allow data URIs for images
      "https:", // Allow HTTPS images
      "blob:" // Allow blob URLs for dynamic images
    ],
    
    // Connect sources - allow API calls to same origin and external APIs
    connectSrc: [
      "'self'",
      "https://api.telegram.org",
      "https://*.supabase.co",
      "https://*.vercel.app"
    ],
    
    // Object sources - restrict embedded objects
    objectSrc: ["'none'"],
    
    // Media sources - allow media from same origin
    mediaSrc: ["'self'"],
    
    // Frame sources - restrict iframes
            frameSrc: ["'self'"],
    
    // Base URI - restrict base tag
    baseUri: ["'self'"],
    
    // Form action - restrict form submissions
    formAction: ["'self'"],
    
    // Upgrade insecure requests
    upgradeInsecureRequests: []
  },
  
  // Report violations to a reporting endpoint (optional)
  reportOnly: false,
  
  // Set to true in development for more permissive policy
  loose: process.env.NODE_ENV !== 'production'
};

// Create CSP middleware
function createCSPMiddleware() {
  if (process.env.NODE_ENV === 'production') {
    return helmet.contentSecurityPolicy(cspConfig);
  } else {
    // More permissive CSP for development
    const devCSPConfig = {
      ...cspConfig,
      directives: {
        ...cspConfig.directives,
        scriptSrc: [...cspConfig.directives.scriptSrc, "'unsafe-inline'"],
        styleSrc: [...cspConfig.directives.styleSrc, "'unsafe-inline'"]
      }
    };
    return helmet.contentSecurityPolicy(devCSPConfig);
  }
}

// Additional security headers
const securityHeaders = helmet({
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // XSS protection
  xssFilter: true,
  
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

module.exports = {
  cspMiddleware: createCSPMiddleware(),
  securityHeaders,
  cspConfig
};
