// config.js
// Dynamic API base URL that works for both local development and production
window.API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : `https://${window.location.hostname}`; 