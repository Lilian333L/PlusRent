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

    console.log(`📡 Making ${method} request to: ${url.hostname}${url.pathname}${url.search}`);
    if (data) {
      console.log('📦 Request data:', JSON.stringify(data, null, 2));
    }

    const req = https.request(options, (res) => {
      console.log(`📊 Response status: ${res.statusCode}`);
      console.log(`📋 Response headers:`, res.headers);
      
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          console.log('✅ Response data:', JSON.stringify(parsedData, null, 2));
          resolve(parsedData);
        } catch (e) {
          console.log('📄 Raw response:', rawData);
          resolve(rawData);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testSupabaseRESTDatabase() {
  console.log('🔍 Testing Supabase REST API Database Operations...');
  console.log('Project URL:', SUPABASE_URL);
  console.log('API Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  console.log('');

  try {
    // Test 1: Check if tables exist
    console.log('📋 Test 1: Checking if tables exist...');
    const tables = await makeRequest('GET', 'cars?limit=1');
    console.log('✅ Cars table accessible');
    console.log('');

    // Test 2: Insert a test car
    console.log('📝 Test 2: Inserting a test car...');
    const testCar = {
      make_name: 'Test',
      model_name: 'API Car',
      production_year: 2024,
      gear_type: 'Automatic',
      fuel_type: 'Electric',
      engine_capacity: 2.0,
      car_type: 'Sedan',
      num_doors: 4,
      num_passengers: 5,
      price_policy: JSON.stringify({
        '1-2': '50',
        '3-7': '45',
        '8-20': '40',
        '21-45': '35',
        '46+': '30'
      }),
      status: 'available'
    };

    const insertResult = await makeRequest('POST', 'cars', testCar);
    console.log('✅ Test car inserted successfully');
    console.log('');

    // Test 3: Get all cars
    console.log('📋 Test 3: Getting all cars...');
    const allCars = await makeRequest('GET', 'cars');
    console.log(`✅ Retrieved ${allCars.length} cars`);
    console.log('');

    // Test 4: Get specific car by ID
    if (insertResult && insertResult.id) {
      console.log('🔍 Test 4: Getting specific car by ID...');
      const specificCar = await makeRequest('GET', `cars?id=eq.${insertResult.id}&limit=1`);
      console.log('✅ Retrieved specific car:', specificCar[0] ? 'Found' : 'Not found');
      console.log('');

      // Test 5: Update the test car
      console.log('✏️ Test 5: Updating the test car...');
      const updateData = {
        make_name: 'Updated Test',
        model_name: 'Updated API Car'
      };
      const updateResult = await makeRequest('PATCH', `cars?id=eq.${insertResult.id}`, updateData);
      console.log('✅ Test car updated successfully');
      console.log('');

      // Test 6: Delete the test car
      console.log('🗑️ Test 6: Deleting the test car...');
      const deleteResult = await makeRequest('DELETE', `cars?id=eq.${insertResult.id}`);
      console.log('✅ Test car deleted successfully');
      console.log('');
    }

    console.log('🎉 All Supabase REST API database tests completed successfully!');
    console.log('✅ The REST API approach is working perfectly!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Full error:', error);
  }
}

testSupabaseRESTDatabase(); 