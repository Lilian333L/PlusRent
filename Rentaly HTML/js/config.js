// config.js
// Dynamic API base URL that works for both local development and production
window.API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'https://carrental-rho-rose.vercel.app' // Use production API even when testing locally
  : `https://${window.location.hostname}`; // Use the same domain as the current page 