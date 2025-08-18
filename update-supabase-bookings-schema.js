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

async function updateBookingsSchema() {
  console.log('🔧 Updating Supabase bookings table schema...\n');

  // Note: We can't directly alter tables via REST API
  // This would need to be done through Supabase dashboard or SQL editor
  console.log('⚠️  Note: Table schema updates cannot be done via REST API');
  console.log('📋 Please run the following SQL in your Supabase SQL editor:\n');
  
  console.log(`
-- Update bookings table schema
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_time TIME,
ADD COLUMN IF NOT EXISTS return_time TIME,
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS insurance_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS price_breakdown JSONB,
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

-- Rename existing columns to match our application
ALTER TABLE bookings 
RENAME COLUMN start_date TO pickup_date;

ALTER TABLE bookings 
RENAME COLUMN end_date TO return_date;

-- Add NOT NULL constraints where needed
ALTER TABLE bookings 
ALTER COLUMN insurance_type SET NOT NULL,
ALTER COLUMN pickup_location SET NOT NULL,
ALTER COLUMN dropoff_location SET NOT NULL;

-- Set default values
ALTER TABLE bookings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
  `);

  console.log('\n🏁 Schema update instructions provided!');
  console.log('📝 Please run the SQL above in your Supabase SQL editor, then test booking creation again.');
}

// Run the update
updateBookingsSchema().catch(console.error); 