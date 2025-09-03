// config.js
// API base URL configuration for Vercel deployment
// Use relative URLs for serverless functions

// Ensure API_BASE_URL is always available
if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = '';
  console.log('🌐 API Base URL set to empty string for relative URLs');
} else {
  console.log('🌐 API Base URL already configured as:', window.API_BASE_URL);
}

console.log('🌐 Final API Base URL:', window.API_BASE_URL);
console.log('🌐 Using relative URLs for Vercel deployment'); 