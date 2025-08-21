// config.js
// Dynamic API base URL that works for both local development and production
window.API_BASE_URL = (function() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // If we're on localhost, use the same port as the current page
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${port || '3000'}`;
  }
  
  // If we're on Vercel or any other production domain, use the same domain
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
})();

console.log('🌐 API Base URL configured as:', window.API_BASE_URL); 