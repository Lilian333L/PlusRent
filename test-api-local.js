const express = require('express');
const path = require('path');

// Import the API handler
const apiHandler = require('./api/index');

// Create a test server
const app = express();
const PORT = 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount the API handler at /api
app.use('/api', apiHandler);

// Test endpoint to verify the server is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Test Server Running', 
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/test',
      '/api/cars',
      '/api/cars/booking/available',
      '/api/auth',
      '/api/bookings',
      '/api/coupons',
      '/api/spinning-wheels'
    ]
  });
});

// Start the test server
app.listen(PORT, () => {
  console.log(`🚀 API Test Server running on http://localhost:${PORT}`);
  console.log(`📋 Test these endpoints:`);
  console.log(`   - Health check: http://localhost:${PORT}/api/health`);
  console.log(`   - Database test: http://localhost:${PORT}/api/test`);
  console.log(`   - Cars API: http://localhost:${PORT}/api/cars`);
  console.log(`   - Available cars: http://localhost:${PORT}/api/cars/booking/available`);
  console.log(`\n🔗 Test with: curl http://localhost:${PORT}/api/health`);
}); 