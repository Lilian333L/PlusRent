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

    console.log(`🌐 Making ${method} request to: ${url.href}`);

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log(`📡 Response status: ${res.statusCode}`);
        try {
          const parsedData = JSON.parse(rawData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: rawData });
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

// Test the exact query that the API uses
async function debugQuery() {
  console.log('🔍 Debugging Supabase query...\n');
  
  // Test 1: Direct Supabase query (what we know works)
  console.log('1️⃣ Testing direct Supabase query...');
  try {
    const result1 = await makeRequest('GET', 'cars');
    console.log(`✅ Direct query: Found ${Array.isArray(result1.data) ? result1.data.length : 0} cars`);
    if (Array.isArray(result1.data) && result1.data.length > 0) {
      console.log('Sample car:', result1.data[0]);
    }
  } catch (error) {
    console.error('❌ Direct query failed:', error.message);
  }
  
  console.log('');
  
  // Test 2: Simulate the API's database interface query
  console.log('2️⃣ Testing API-style query...');
  try {
    // This is what our database interface does
    let endpoint = 'cars';
    const queryParams = [];
    
    // Simulate the SQL: SELECT * FROM cars ORDER BY display_order ASC, id ASC
    const sqlLower = 'select * from cars order by display_order asc, id asc';
    
    // Add ORDER BY
    if (sqlLower.includes('order by')) {
      if (sqlLower.includes('display_order')) {
        queryParams.push('order=display_order.asc');
      } else if (sqlLower.includes('id')) {
        queryParams.push('order=id.asc');
      }
    }
    
    // Build final endpoint
    if (queryParams.length > 0) {
      endpoint += '?' + queryParams.join('&');
    }
    
    console.log('🌐 API-style endpoint:', endpoint);
    
    const result2 = await makeRequest('GET', endpoint);
    console.log(`✅ API-style query: Found ${Array.isArray(result2.data) ? result2.data.length : 0} cars`);
    if (Array.isArray(result2.data) && result2.data.length > 0) {
      console.log('Sample car:', result2.data[0]);
    }
  } catch (error) {
    console.error('❌ API-style query failed:', error.message);
  }
  
  console.log('');
  
  // Test 3: Check if display_order column exists
  console.log('3️⃣ Checking table structure...');
  try {
    const result3 = await makeRequest('GET', 'cars?limit=1&select=*');
    if (Array.isArray(result3.data) && result3.data.length > 0) {
      const car = result3.data[0];
      console.log('✅ Table structure:');
      console.log('Available columns:', Object.keys(car));
      console.log('Has display_order:', 'display_order' in car);
    }
  } catch (error) {
    console.error('❌ Structure check failed:', error.message);
  }
}

// Run the debug
debugQuery().catch(console.error); 