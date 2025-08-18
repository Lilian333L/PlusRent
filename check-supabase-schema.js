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

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`);
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          resolve(rawData);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function checkSchema() {
  console.log('🔍 Checking Supabase database schema...\n');

  // Try to get a single record to see the structure
  try {
    console.log('1️⃣ Checking bookings table structure...');
    const bookings = await makeRequest('GET', 'bookings?limit=1');
    console.log('📋 Bookings table sample:', bookings);
    
    if (Array.isArray(bookings) && bookings.length > 0) {
      console.log('\n📊 Bookings table columns:');
      Object.keys(bookings[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof bookings[0][column]}`);
      });
    } else {
      console.log('❌ No bookings found, table might be empty');
    }
  } catch (error) {
    console.error('❌ Error checking bookings table:', error.message);
  }

  console.log('\n2️⃣ Checking cars table structure...');
  try {
    const cars = await makeRequest('GET', 'cars?limit=1');
    console.log('📋 Cars table sample:', cars);
    
    if (Array.isArray(cars) && cars.length > 0) {
      console.log('\n📊 Cars table columns:');
      Object.keys(cars[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof cars[0][column]}`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking cars table:', error.message);
  }

  console.log('\n🏁 Schema check completed!');
}

// Run the check
checkSchema().catch(console.error); 