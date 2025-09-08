// Local development server
require('dotenv').config();

const express = require('express');
const path = require('path');

// Import the main app from api/index.js
const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api/*`);
});

module.exports = app;
