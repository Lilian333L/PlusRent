const express = require('express');
const path = require('path');

// Import the API handler
const apiHandler = require('./api/index');

// Create the server
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount the API handler at /api
app.use('/api', apiHandler);

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle other HTML routes
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, 'public', `${page}.html`);
  
  // Check if the file exists
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // If the file doesn't exist, try to serve it as a static file
    res.sendFile(path.join(__dirname, 'public', page));
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - Main site: http://localhost:${PORT}`);
  console.log(`   - API health: http://localhost:${PORT}/api/health`);
  console.log(`   - Cars: http://localhost:${PORT}/cars.html`);
  console.log(`   - Login: http://localhost:${PORT}/login.html`);
  console.log(`   - Admin Dashboard: http://localhost:${PORT}/account-dashboard.html`);
  console.log(`   - All Codes: http://localhost:${PORT}/all-codes.html`);
  console.log(`\n🔗 Test API: curl http://localhost:${PORT}/api/health`);
}); 