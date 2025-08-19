// config.js
// Dynamic API base URL that works for both local development and production
window.API_BASE_URL = window.location.hostname === 'localhost' 
  ? (window.location.port === '3000' ? 'http://localhost:3000' : 'http://localhost:3001')
  : `https://${window.location.hostname}`; // Use the same domain as the current page

// For Vercel dev, always use the same port as the current page
if (window.location.port === '3000') {
  window.API_BASE_URL = 'http://localhost:3000';
} 