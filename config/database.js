const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Check if we're in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';

let db;

if (isProduction) {
  // Production: Use Vercel Postgres
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  db = {
    run: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(sql, params, (err, result) => {
        if (callback) callback(err, result);
      });
    },
    get: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(sql, params, (err, result) => {
        if (callback) callback(err, result.rows[0]);
      });
    },
    all: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(sql, params, (err, result) => {
        if (callback) callback(err, result.rows);
      });
    },
    serialize: (callback) => {
      callback();
    }
  };
  
  console.log('✅ Connected to Vercel Postgres database');
} else {
  // Development: Use SQLite
  function ensureDatabaseWritable() {
    const dbPath = './carrental.db';
    
    if (fs.existsSync(dbPath)) {
      try {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
        console.log('✅ Database file is writable');
      } catch (error) {
        console.error('❌ Database file is not writable:', error.message);
        console.log('🔧 Attempting to fix permissions...');
        
        try {
          fs.chmodSync(dbPath, 0o666);
          console.log('✅ Database permissions fixed');
        } catch (chmodError) {
          console.error('❌ Could not fix database permissions:', chmodError.message);
        }
      }
    }
  }

  ensureDatabaseWritable();

  try {
    db = new sqlite3.Database('./carrental.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('❌ Could not connect to database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        
        db.run('PRAGMA journal_mode=WAL', (err) => {
          if (err) {
            console.error('❌ Database write test failed:', err.message);
          } else {
            console.log('✅ Database write access confirmed');
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Failed to create database connection:', error.message);
    process.exit(1);
  }
}

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Create cars table with all fields
    db.run(`CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY,
      make_name TEXT,
      model_name TEXT,
      production_year INTEGER,
      gear_type TEXT,
      fuel_type TEXT,
      engine_capacity REAL NULL,
      car_type TEXT,
      num_doors INTEGER,
      num_passengers INTEGER,
      price_policy TEXT,
      booked INTEGER DEFAULT 0,
      booked_until TEXT,
      head_image TEXT,
      gallery_images TEXT,
      luggage TEXT,
      mileage INTEGER,
      drive TEXT,
      fuel_economy REAL,
      exterior_color TEXT,
      interior_color TEXT,
      rca_insurance_price REAL,
      casco_insurance_price REAL,
      is_premium BOOLEAN DEFAULT FALSE,
      likes INTEGER DEFAULT 0,
      description TEXT DEFAULT '{}'
    )`);

    // Create admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )`);

    // Create coupon codes table
    db.run(`CREATE TABLE IF NOT EXISTS coupon_codes (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'percentage',
      discount_percentage INTEGER,
      free_days INTEGER,
      max_uses INTEGER DEFAULT NULL,
      current_uses INTEGER DEFAULT 0,
      valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      valid_until TIMESTAMP DEFAULT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      available_codes TEXT DEFAULT '[]',
      showed_codes TEXT DEFAULT '[]'
    )`);

    // Create spinning wheels table
    db.run(`CREATE TABLE IF NOT EXISTS spinning_wheels (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      car_id INTEGER NOT NULL,
      pickup_date TEXT NOT NULL,
      pickup_time TEXT NOT NULL,
      return_date TEXT NOT NULL,
      return_time TEXT NOT NULL,
      discount_code TEXT,
      insurance_type TEXT NOT NULL,
      pickup_location TEXT NOT NULL,
      dropoff_location TEXT NOT NULL,
      contact_person TEXT,
      contact_phone TEXT,
      special_instructions TEXT,
      total_price REAL NOT NULL,
      price_breakdown TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create booked_cars table for tracking active bookings with user info
    db.run(`CREATE TABLE IF NOT EXISTS booked_cars (
      id SERIAL PRIMARY KEY,
      car_id INTEGER NOT NULL,
      booking_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      pickup_time TEXT NOT NULL,
      return_date TEXT NOT NULL,
      return_time TEXT NOT NULL,
      insurance_type TEXT NOT NULL,
      pickup_location TEXT NOT NULL,
      dropoff_location TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create wheel_coupons junction table for many-to-many relationship
    db.run(`CREATE TABLE IF NOT EXISTS wheel_coupons (
      id SERIAL PRIMARY KEY,
      wheel_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      percentage REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(wheel_id, coupon_id)
    )`);
  });
}

module.exports = {
  db,
  initializeDatabase
}; 