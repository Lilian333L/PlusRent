const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

console.log('🔐 Setting up Row-Level Security (RLS) policies for Supabase...\n');

// SQL commands to set up RLS policies
const rlsCommands = [
  // Enable RLS on all tables
  'ALTER TABLE cars ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE booked_cars ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE spinning_wheels ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE wheel_coupons ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE users ENABLE ROW LEVEL SECURITY;',
  
  // Create policies for cars table
  'CREATE POLICY "Enable read access for all users" ON cars FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON cars FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON cars FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON cars FOR DELETE USING (true);',
  
  // Create policies for admin_users table
  'CREATE POLICY "Enable read access for all users" ON admin_users FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON admin_users FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON admin_users FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON admin_users FOR DELETE USING (true);',
  
  // Create policies for bookings table
  'CREATE POLICY "Enable read access for all users" ON bookings FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON bookings FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON bookings FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON bookings FOR DELETE USING (true);',
  
  // Create policies for booked_cars table
  'CREATE POLICY "Enable read access for all users" ON booked_cars FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON booked_cars FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON booked_cars FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON booked_cars FOR DELETE USING (true);',
  
  // Create policies for spinning_wheels table
  'CREATE POLICY "Enable read access for all users" ON spinning_wheels FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON spinning_wheels FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON spinning_wheels FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON spinning_wheels FOR DELETE USING (true);',
  
  // Create policies for coupon_codes table
  'CREATE POLICY "Enable read access for all users" ON coupon_codes FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON coupon_codes FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON coupon_codes FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON coupon_codes FOR DELETE USING (true);',
  
  // Create policies for wheel_coupons table
  'CREATE POLICY "Enable read access for all users" ON wheel_coupons FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON wheel_coupons FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON wheel_coupons FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON wheel_coupons FOR DELETE USING (true);',
  
  // Create policies for users table
  'CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);',
  'CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);',
  'CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);',
  'CREATE POLICY "Enable delete for all users" ON users FOR DELETE USING (true);'
];

console.log('📋 SQL Commands to execute in Supabase Dashboard:\n');
console.log('================================================================================\n');

rlsCommands.forEach((command, index) => {
  console.log(`-- Command ${index + 1}:`);
  console.log(command);
  console.log('');
});

console.log('================================================================================\n');
console.log('🔧 Instructions:');
console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Select your project: lupoqmzqppynyybbvwah');
console.log('3. Go to SQL Editor');
console.log('4. Copy and paste the SQL commands above');
console.log('5. Run the commands');
console.log('');
console.log('✅ After setting up RLS, run: node scripts/test-supabase-rest-db.js'); 