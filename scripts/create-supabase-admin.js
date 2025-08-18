const https = require('https');
const bcrypt = require('bcrypt');

const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = SUPABASE_URL + endpoint;
    const options = {
      method: method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData ? JSON.parse(responseData) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createSupabaseAdmin() {
  try {
    console.log('🔧 Creating admin user in Supabase...');
    
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@rentaly.com';
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Check if admin table exists, if not create it
    try {
      await makeRequest('GET', 'admin_users?limit=1');
      console.log('✅ Admin users table exists');
    } catch (error) {
      console.log('⚠️ Admin users table not found. Please create it first in Supabase SQL Editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
      `);
      return;
    }
    
    // Check if admin already exists
    try {
      const existingAdmin = await makeRequest('GET', `admin_users?username=eq.${username}`);
      if (existingAdmin && existingAdmin.length > 0) {
        console.log('⚠️ Admin user already exists!');
        console.log('Username:', existingAdmin[0].username);
        console.log('Email:', existingAdmin[0].email);
        return;
      }
    } catch (error) {
      // User doesn't exist, continue
    }
    
    // Create new admin user
    const adminData = {
      username: username,
      password_hash: passwordHash,
      email: email
    };
    
    const result = await makeRequest('POST', 'admin_users', adminData);
    
    console.log('✅ Admin user created successfully in Supabase!');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
    console.log('⚠️ IMPORTANT: Change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

createSupabaseAdmin().catch(console.error); 