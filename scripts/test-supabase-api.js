const https = require('https');

// Supabase configuration
const PROJECT_REF = 'lupoqmzqppynyybbvwah';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co/rest/v1/`;

// Your actual anon key
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

function testSupabaseAPI() {
  console.log('🔍 Testing Supabase REST API...');
  console.log('Project Reference:', PROJECT_REF);
  console.log('API URL:', SUPABASE_URL);
  console.log('API Key (first 20 chars):', ANON_KEY.substring(0, 20) + '...');
  
  // Test 1: Basic connection test
  console.log('\n📡 Test 1: Basic connection test (without authentication)');
  testConnection(false);
  
  // Test 2: With authentication
  console.log('\n📡 Test 2: With authentication');
  testConnection(true);
}

function testConnection(withAuth) {
  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    port: 443,
    path: '/rest/v1/',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (withAuth) {
    options.headers['apikey'] = ANON_KEY;
    options.headers['Authorization'] = `Bearer ${ANON_KEY}`;
  }
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
    });
  });
  
  req.on('error', (e) => {
    console.error('Error:', e.message);
  });
  
  req.end();
}

testSupabaseAPI(); 