const https = require('https');

// Supabase configuration
const PROJECT_REF = 'lupoqmzqppynyybbvwah';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co/rest/v1/`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

function testSupabaseREST() {
  console.log('🔍 Testing Supabase REST API with mobile data...');
  console.log('Project Reference:', PROJECT_REF);
  console.log('API URL:', SUPABASE_URL);
  console.log('Network: Mobile data');

  // Test 1: Basic connection test
  console.log('\n📡 Test 1: Basic connection test (without authentication)');
  testConnection(false);

  // Test 2: Authenticated test
  console.log('\n📡 Test 2: Authenticated test (with API key)');
  testConnection(true);
}

function testConnection(withAuth) {
  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/rest/v1/',
    method: 'GET',
    headers: {}
  };

  if (withAuth) {
    options.headers['apikey'] = ANON_KEY;
    options.headers['Authorization'] = `Bearer ${ANON_KEY}`;
  }

  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        console.log('RESPONSE:', parsedData);
      } catch (e) {
        console.error('Error parsing JSON response:', e.message);
        console.log('RAW RESPONSE:', rawData);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
}

testSupabaseREST(); 