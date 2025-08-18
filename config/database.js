const path = require('path');
const fs = require('fs');
const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

// Check if we're in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production';

// Always use Supabase in production, or if explicitly configured
const useSupabase = isProduction || isVercel || process.env.SUPABASE_URL || process.env.DATABASE_URL;

console.log('Environment:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);
console.log('Is Vercel:', isVercel);
console.log('Use Supabase:', useSupabase);
console.log('VERCEL env:', process.env.VERCEL);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);

let db;

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

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
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

// Create Supabase-based database interface
function createSupabaseDB() {
  console.log('🔗 Creating Supabase REST API database interface');
  
  return {
    run: (sql, params, callback) => {
      // For INSERT, UPDATE, DELETE operations
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      // Parse SQL to determine operation type
      const sqlLower = sql.toLowerCase();
      let method, endpoint, data;
      
      if (sqlLower.includes('insert into cars')) {
        method = 'POST';
        endpoint = 'cars';
        data = params[0] || {};
      } else if (sqlLower.includes('insert into admin_users')) {
        method = 'POST';
        endpoint = 'admin_users';
        data = params[0] || {};
      } else if (sqlLower.includes('update cars')) {
        method = 'PATCH';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[params.length - 1] : null;
        endpoint = `cars?id=eq.${id}`;
        data = params[0] || {};
      } else if (sqlLower.includes('update admin_users')) {
        method = 'PATCH';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[params.length - 1] : null;
        endpoint = `admin_users?id=eq.${id}`;
        data = params[0] || {};
      } else if (sqlLower.includes('delete from cars')) {
        method = 'DELETE';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[0] : null;
        endpoint = `cars?id=eq.${id}`;
      }
      
      makeRequest(method, endpoint, data)
        .then(result => {
          if (callback) callback(null, result);
        })
        .catch(error => {
          if (callback) callback(error);
        });
    },
    
    get: (sql, params, callback) => {
      // For SELECT single row operations
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      const sqlLower = sql.toLowerCase();
      let endpoint = 'cars';
      
      // Determine which table to query
      if (sqlLower.includes('admin_users')) {
        endpoint = 'admin_users';
      }
      
      // Parse SQL to build REST API query
      if (sqlLower.includes('where')) {
        // ID filter for single record
        if (sqlLower.includes('id = ?')) {
          const id = params[0];
          endpoint += `?id=eq.${id}`;
        }
        // Username filter for admin users
        else if (sqlLower.includes('username = ?')) {
          const username = params[0];
          endpoint += `?username=eq.${encodeURIComponent(username)}`;
        }
        // Status filter for cars
        else if (sqlLower.includes('status')) {
          endpoint += '?status=eq.available';
        }
      }
      
      console.log('🌐 Supabase single record query:', endpoint);
      
      makeRequest('GET', endpoint)
        .then(result => {
          const rows = Array.isArray(result) ? result : [];
          // For single record queries, return the first record or null
          if (callback) callback(null, rows.length > 0 ? rows[0] : null);
        })
        .catch(error => {
          console.error('❌ Supabase single record query error:', error);
          if (callback) callback(error);
        });
    },
    
    all: (sql, params, callback) => {
      // For SELECT multiple rows operations
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      let endpoint = 'cars';
      const queryParams = [];
      
      // Parse SQL to build REST API query
      const sqlLower = sql.toLowerCase();
      
      // Handle WHERE clauses
      if (sqlLower.includes('where')) {
        // Status filter
        if (sqlLower.includes('status')) {
          queryParams.push('status=eq.available');
        }
        
        // Make name filter
        if (sqlLower.includes('make_name')) {
          const makeIndex = params.findIndex(p => p && typeof p === 'string');
          if (makeIndex !== -1) {
            queryParams.push(`make_name=eq.${encodeURIComponent(params[makeIndex])}`);
          }
        }
        
        // Model name filter
        if (sqlLower.includes('model_name')) {
          const modelIndex = params.findIndex(p => p && typeof p === 'string');
          if (modelIndex !== -1) {
            queryParams.push(`model_name=eq.${encodeURIComponent(params[modelIndex])}`);
          }
        }
        
        // Gear type filter
        if (sqlLower.includes('gear_type')) {
          const gearIndex = params.findIndex(p => p && typeof p === 'string');
          if (gearIndex !== -1) {
            queryParams.push(`gear_type=eq.${encodeURIComponent(params[gearIndex])}`);
          }
        }
        
        // Fuel type filter
        if (sqlLower.includes('fuel_type')) {
          const fuelIndex = params.findIndex(p => p && typeof p === 'string');
          if (fuelIndex !== -1) {
            queryParams.push(`fuel_type=eq.${encodeURIComponent(params[fuelIndex])}`);
          }
        }
        
        // Car type filter
        if (sqlLower.includes('car_type')) {
          const carTypeIndex = params.findIndex(p => p && typeof p === 'string');
          if (carTypeIndex !== -1) {
            queryParams.push(`car_type=eq.${encodeURIComponent(params[carTypeIndex])}`);
          }
        }
        
        // Production year filters
        if (sqlLower.includes('production_year >=')) {
          const yearIndex = params.findIndex(p => p && typeof p === 'number');
          if (yearIndex !== -1) {
            queryParams.push(`production_year=gte.${params[yearIndex]}`);
          }
        }
        
        if (sqlLower.includes('production_year <=')) {
          const yearIndex = params.findIndex(p => p && typeof p === 'number');
          if (yearIndex !== -1) {
            queryParams.push(`production_year=lte.${params[yearIndex]}`);
          }
        }
      }
      
      // Add ORDER BY
      if (sqlLower.includes('order by')) {
        if (sqlLower.includes('display_order')) {
          // display_order column doesn't exist in Supabase, use id instead
          queryParams.push('order=id.asc');
        } else if (sqlLower.includes('id')) {
          queryParams.push('order=id.asc');
        }
      }
      
      // Build final endpoint
      if (queryParams.length > 0) {
        endpoint += '?' + queryParams.join('&');
      }
      
      console.log('🌐 Supabase query:', endpoint);
      
      makeRequest('GET', endpoint)
        .then(result => {
          const rows = Array.isArray(result) ? result : [];
          if (callback) callback(null, rows);
        })
        .catch(error => {
          console.error('❌ Supabase query error:', error);
          if (callback) callback(error);
        });
    },
    
    close: () => {
      console.log('Supabase REST API connection closed');
    }
  };
}

// Always use Supabase in production or on Vercel
if (useSupabase) {
  db = createSupabaseDB();
} else {
  // Only try SQLite in development if not in production
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', 'carrental.db');
    const dbExists = fs.existsSync(dbPath);

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database:', err.message);
      } else {
        console.log('Connected to SQLite database.');
        if (!dbExists) {
          console.log('Creating SQLite tables...');
          db.serialize(() => {
            db.run(`
              CREATE TABLE cars (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                make_name TEXT,
                model_name TEXT,
                production_year INTEGER,
                gear_type TEXT,
                fuel_type TEXT,
                engine_capacity REAL,
                car_type TEXT,
                num_doors INTEGER,
                num_passengers INTEGER,
                price_policy TEXT,
                booked BOOLEAN DEFAULT FALSE,
                booked_until DATE,
                head_image TEXT,
                gallery_images TEXT,
                description TEXT,
                luggage TEXT,
                drive TEXT,
                air_conditioning BOOLEAN,
                min_age INTEGER,
                deposit REAL,
                insurance_cost REAL,
                status TEXT DEFAULT 'available'
              )
            `);
            db.run(`
              CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'user'
              )
            `);
            db.run(`
              CREATE TABLE bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                car_id INTEGER,
                user_id INTEGER,
                start_date DATE,
                end_date DATE,
                total_price REAL,
                status TEXT DEFAULT 'pending',
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (user_id) REFERENCES cars(id)
              )
            `);
            console.log('SQLite tables created.');
          });
        }
      }
    });
  } catch (error) {
    console.error('SQLite3 not available, falling back to Supabase:', error.message);
    db = createSupabaseDB();
  }
}

module.exports = db; 