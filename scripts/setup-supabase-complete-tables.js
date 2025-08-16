const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

console.log('🏗️ Creating complete database schema for Supabase (8 tables)...\n');

// SQL commands to create all tables
const createTablesSQL = [
  // 1. cars table
  `CREATE TABLE IF NOT EXISTS cars (
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
    gallery_images JSONB DEFAULT '[]',
    luggage VARCHAR(100),
    mileage INTEGER,
    drive VARCHAR(50),
    fuel_economy DECIMAL(5,2),
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    rca_insurance_price DECIMAL(8,2),
    casco_insurance_price DECIMAL(8,2),
    is_premium BOOLEAN DEFAULT FALSE,
    likes INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    description JSONB DEFAULT '{}'
  );`,

  // 2. admin_users table
  `CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
  );`,

  // 3. bookings table
  `CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    return_date DATE NOT NULL,
    return_time TIME NOT NULL,
    discount_code VARCHAR(50),
    insurance_type VARCHAR(50) NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    special_instructions TEXT,
    total_price DECIMAL(10,2) NOT NULL,
    price_breakdown JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars (id)
  );`,

  // 4. booked_cars table
  `CREATE TABLE IF NOT EXISTS booked_cars (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL,
    booking_id INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    return_date DATE NOT NULL,
    return_time TIME NOT NULL,
    insurance_type VARCHAR(50) NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
  );`,

  // 5. spinning_wheels table
  `CREATE TABLE IF NOT EXISTS spinning_wheels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // 6. coupon_codes table
  `CREATE TABLE IF NOT EXISTS coupon_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'percentage',
    discount_percentage INTEGER,
    description TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    wheel_enabled BOOLEAN DEFAULT FALSE,
    free_days INTEGER,
    available_codes JSONB DEFAULT '[]',
    showed_codes JSONB DEFAULT '[]'
  );`,

  // 7. wheel_coupons table (junction table)
  `CREATE TABLE IF NOT EXISTS wheel_coupons (
    id SERIAL PRIMARY KEY,
    wheel_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    percentage DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (wheel_id) REFERENCES spinning_wheels (id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupon_codes (id) ON DELETE CASCADE,
    UNIQUE(wheel_id, coupon_id)
  );`,

  // 8. users table (if needed for authentication)
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password TEXT,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user'
  );`
];

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

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Execute SQL commands
async function createTables() {
  console.log('📋 SQL Commands to execute in Supabase Dashboard:\n');
  console.log('=' .repeat(80));
  
  for (let i = 0; i < createTablesSQL.length; i++) {
    console.log(`\n-- Table ${i + 1}:`);
    console.log(createTablesSQL[i]);
    console.log('\n' + '=' .repeat(80));
  }

  console.log('\n\n🔧 Instructions:');
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project: lupoqmzqppynyybbvwah');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste the SQL commands above');
  console.log('5. Run the commands');
  console.log('\n✅ After creating the tables, run: node scripts/test-supabase-rest-db.js');
}

createTables().catch(console.error); 