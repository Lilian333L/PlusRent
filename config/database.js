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
      } else if (sqlLower.includes('insert into bookings')) {
        method = 'POST';
        endpoint = 'bookings';
        // Map the parameters to the correct data structure for bookings
        data = {
          car_id: params[0],
          pickup_date: params[1],
          pickup_time: params[2],
          return_date: params[3],
          return_time: params[4],
          discount_code: params[5],
          insurance_type: params[6],
          pickup_location: params[7],
          dropoff_location: params[8],
          customer_name: params[9] || null,
          customer_phone: params[10] || null,
          special_instructions: params[11] || null,
          total_price: params[12],
          price_breakdown: params[13] || null,
          status: params[14],
          created_at: params[15]
        };
        
        // Remove null/undefined values and non-existent fields to avoid Supabase errors
        Object.keys(data).forEach(key => {
          if (data[key] === null || data[key] === undefined || data[key] === '') {
            delete data[key];
          }
        });
        
        // Remove fields that don't exist in Supabase schema
        delete data.contact_person;
        delete data.contact_phone;
        delete data.customer_email; // This field might not exist either
        
        console.log('📝 Creating booking with data:', data);
        console.log('📝 Parameters received:', params);
      } else if (sqlLower.includes('update cars')) {
        method = 'PATCH';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[params.length - 1] : null;
        endpoint = `cars?id=eq.${id}`;
        
        // Parse the SET clause to extract field names and values
        const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
        if (setMatch) {
          const setClause = setMatch[1];
          const fields = setClause.split(',').map(field => field.trim().split('=')[0].trim());
          data = {};
          fields.forEach((field, index) => {
            if (params[index] !== undefined) {
              data[field] = params[index];
            }
          });
        } else {
          data = params[0] || {};
        }
        console.log('📝 Updating car with data:', data);
      } else if (sqlLower.includes('update admin_users')) {
        method = 'PATCH';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[params.length - 1] : null;
        endpoint = `admin_users?id=eq.${id}`;
        data = params[0] || {};
      } else if (sqlLower.includes('update bookings')) {
        method = 'PATCH';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[params.length - 1] : null;
        endpoint = `bookings?id=eq.${id}`;
        
        // Parse the SET clause to extract field names and values
        const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
        if (setMatch) {
          const setClause = setMatch[1];
          const fields = setClause.split(',').map(field => field.trim().split('=')[0].trim());
          data = {};
          fields.forEach((field, index) => {
            if (params[index] !== undefined) {
              data[field] = params[index];
            }
          });
        } else {
          data = params[0] || {};
        }
        console.log('📝 Updating booking with data:', data);
      } else if (sqlLower.includes('delete from cars')) {
        method = 'DELETE';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[0] : null;
        endpoint = `cars?id=eq.${id}`;
      }
      
      makeRequest(method, endpoint, data)
        .then(result => {
          console.log('✅ Supabase request successful:', result);
          if (callback) callback(null, result);
        })
        .catch(error => {
          console.error('❌ Supabase request failed:', error);
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
      if (sqlLower.includes('from admin_users') || sqlLower.includes('admin_users')) {
        endpoint = 'admin_users';
      } else if (sqlLower.includes('from bookings') || sqlLower.includes('bookings')) {
        endpoint = 'bookings';
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
        else if (sqlLower.includes('status') && sqlLower.includes('cars')) {
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
      
      const sqlLower = sql.toLowerCase();
      let endpoint = 'cars';
      const queryParams = [];
      
      // Determine which table to query
      if (sqlLower.includes('from admin_users') || sqlLower.includes('admin_users')) {
        endpoint = 'admin_users';
      } else if (sqlLower.includes('from bookings') || sqlLower.includes('bookings')) {
        endpoint = 'bookings';
      }
      
      // Parse SQL to build REST API query
      
      // Handle WHERE clauses
      if (sqlLower.includes('where')) {
        // Status filter for cars
        if (sqlLower.includes('status') && sqlLower.includes('cars')) {
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
        
        // Booking status filter
        if (sqlLower.includes('status') && sqlLower.includes('bookings')) {
          queryParams.push('status=eq.pending');
        }
        
        // Car ID filter for bookings
        if (sqlLower.includes('car_id')) {
          const carIdIndex = params.findIndex(p => p && typeof p === 'number');
          if (carIdIndex !== -1) {
            queryParams.push(`car_id=eq.${params[carIdIndex]}`);
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
        } else if (sqlLower.includes('created_at')) {
          queryParams.push('order=created_at.desc');
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
        // Always check if tables exist and create them if they don't
        console.log('Checking SQLite tables...');
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          db.serialize(() => {
            // Split schema into individual statements and execute them
            const statements = schema.split(';').filter(stmt => stmt.trim());
            statements.forEach(statement => {
              if (statement.trim() && !statement.toLowerCase().includes('sqlite_sequence')) {
                // Use CREATE TABLE IF NOT EXISTS for each table
                const createTableStatement = statement.replace(/CREATE TABLE (\w+)/, 'CREATE TABLE IF NOT EXISTS $1');
                db.run(createTableStatement, (err) => {
                  if (err && !err.message.includes('already exists')) {
                    console.error('Error creating table:', err.message);
                  }
                });
              }
            });
            console.log('SQLite tables checked/created.');
          });
        } else {
          console.error('Database schema file not found:', schemaPath);
        }
      }
    });
  } catch (error) {
    console.error('SQLite3 not available, falling back to Supabase:', error.message);
    db = createSupabaseDB();
  }
}

module.exports = db; 