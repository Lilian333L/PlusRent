// config.js
// Dynamic API base URL that works for both local development and production
window.API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'  // Always use port 3001 for local API server
  : `https://${window.location.hostname}`; // Use the same domain as the current page for production

// For Vercel dev, always use the same port as the current page
if (window.location.port === '3000') {
  window.API_BASE_URL = 'http://localhost:3001'; // Always use port 3001 for API
} 