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

async function setupSupabaseTables() {
  console.log('🔧 Setting up Supabase tables via REST API...');
  console.log('Note: This will create tables using SQL commands');
  console.log('');

  try {
    // Since we can't create tables directly via REST API with anon key,
    // we need to use the SQL endpoint or create them manually in the dashboard
    
    console.log('📋 Checking current tables...');
    const tables = await makeRequest('GET', 'rpc/get_tables');
    console.log('Current tables:', tables);
    console.log('');

    console.log('⚠️  IMPORTANT: Tables need to be created manually in Supabase Dashboard');
    console.log('📝 Please follow these steps:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project: lupoqmzqppynyybbvwah');
    console.log('3. Go to SQL Editor');
    console.log('4. Run the following SQL commands:');
    console.log('');

    const createTablesSQL = `
-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
  id SERIAL PRIMARY KEY,
  make_name VARCHAR(100),
  model_name VARCHAR(100),
  production_year INTEGER,
  gear_type VARCHAR(50),
  fuel_type VARCHAR(50),
  engine_capacity DECIMAL(3,1),
  car_type VARCHAR(50),
  num_doors INTEGER,
  num_passengers INTEGER,
  price_policy JSONB,
  booked BOOLEAN DEFAULT FALSE,
  booked_until DATE,
  head_image TEXT,
  gallery_images TEXT,
  description JSONB,
  luggage VARCHAR(50),
  drive VARCHAR(50),
  air_conditioning BOOLEAN,
  min_age INTEGER,
  deposit DECIMAL(10,2),
  insurance_cost DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  car_id INTEGER REFERENCES cars(id),
  user_id INTEGER REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  total_price DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to cars
CREATE POLICY "Allow public read access to cars" ON cars
  FOR SELECT USING (true);

-- Create policies for authenticated users to manage cars
CREATE POLICY "Allow authenticated users to insert cars" ON cars
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update cars" ON cars
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete cars" ON cars
  FOR DELETE USING (auth.role() = 'authenticated');
`;

    console.log(createTablesSQL);
    console.log('');
    console.log('5. After running the SQL, come back and test the connection');
    console.log('');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.error('Full error:', error);
  }
}

setupSupabaseTables(); 