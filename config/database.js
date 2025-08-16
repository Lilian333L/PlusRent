const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

// Check if we're in production (Vercel) or using Supabase
const isProduction = process.env.NODE_ENV === 'production';
const useSupabase = process.env.SUPABASE_URL || process.env.DATABASE_URL;

let db;

if (useSupabase) {
  // Production: Use Supabase REST API
  console.log('🔗 Using Supabase REST API for database operations');
  
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

  db = {
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
      } else if (sqlLower.includes('update cars')) {
        method = 'PATCH';
        const idMatch = sql.match(/WHERE id = \?/);
        const id = idMatch ? params[params.length - 1] : null;
        endpoint = `cars?id=eq.${id}`;
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
      // For SELECT operations returning single row
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      const sqlLower = sql.toLowerCase();
      let endpoint = 'cars';
      
      if (sqlLower.includes('where id =')) {
        const id = params[0];
        endpoint = `cars?id=eq.${id}&limit=1`;
      }
      
      makeRequest('GET', endpoint)
        .then(result => {
          const row = Array.isArray(result) && result.length > 0 ? result[0] : null;
          if (callback) callback(null, row);
        })
        .catch(error => {
          if (callback) callback(error);
        });
    },
    
    all: (sql, params, callback) => {
      // For SELECT operations returning multiple rows
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      let endpoint = 'cars';
      
      // Add query parameters based on SQL
      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('where')) {
        // Handle WHERE clauses
        if (sqlLower.includes('status')) {
          endpoint += '?status=eq.available';
        }
      }
      
      makeRequest('GET', endpoint)
        .then(result => {
          const rows = Array.isArray(result) ? result : [];
          if (callback) callback(null, rows);
        })
        .catch(error => {
          if (callback) callback(error);
        });
    },
    
    close: () => {
      console.log('Supabase REST API connection closed');
    }
  };
} else {
  // Development: Use SQLite
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
              FOREIGN KEY (user_id) REFERENCES users(id)
            )
          `);
          console.log('SQLite tables created.');
        });
      }
    }
  });
}

module.exports = db; 