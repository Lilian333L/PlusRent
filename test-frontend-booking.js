const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

// Helper function to make HTTPS requests
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    console.log(`🌐 Making ${method} request to: ${url.pathname + url.search}`);
    if (data) {
      console.log('📝 Request data:', data);
    }

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`);
        try {
          const parsedData = JSON.parse(rawData);
          console.log('📄 Response data:', parsedData);
          resolve(parsedData);
        } catch (e) {
          console.log('📄 Raw response:', rawData);
          resolve(rawData);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Request error:', e);
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testFrontendBooking() {
  console.log('🧪 Testing booking creation with frontend data...\n');

  // Test data that matches exactly what the frontend is sending (cleaned)
  const frontendBookingData = {
    car_id: "4",
    customer_name: null,
    customer_phone: "32423423",
    discount_code: "",
    dropoff_location: "Our Office",
    insurance_type: "RCA",
    pickup_date: "2025-08-18",
    pickup_location: "Iasi Airport",
    pickup_time: "09:00",
    price_breakdown: {},
    return_date: "2025-08-19",
    return_time: "09:00",
    special_instructions: null,
    total_price: 85
  };

  // Remove null/undefined/empty values
  Object.keys(frontendBookingData).forEach(key => {
    if (frontendBookingData[key] === null || frontendBookingData[key] === undefined || frontendBookingData[key] === '') {
      delete frontendBookingData[key];
    }
  });

  console.log('📝 Testing with frontend data:', frontendBookingData);

  try {
    const result = await makeRequest('POST', 'bookings', frontendBookingData);
    console.log('✅ Frontend booking test result:', result);
  } catch (error) {
    console.error('❌ Frontend booking test error:', error.message);
  }

  console.log('\n🏁 Frontend booking test completed!');
}

// Run the test
testFrontendBooking().catch(console.error); 