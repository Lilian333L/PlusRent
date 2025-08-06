const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database('./carrental.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Create cars table with all fields
    db.run(`CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      casco_insurance_price REAL
    )`);

    // Create admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`);

    // Create coupon codes table
    db.run(`CREATE TABLE IF NOT EXISTS coupon_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'percentage',
      discount_percentage INTEGER,
      free_days INTEGER,
      max_uses INTEGER DEFAULT NULL,
      current_uses INTEGER DEFAULT 0,
      valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
      valid_until DATETIME DEFAULT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create spinning wheels table
    db.run(`CREATE TABLE IF NOT EXISTS spinning_wheels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars (id)
    )`);

    // Create booked_cars table for tracking active bookings with user info
    db.run(`CREATE TABLE IF NOT EXISTS booked_cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars (id),
      FOREIGN KEY (booking_id) REFERENCES bookings (id)
    )`);

    // Add columns to cars table if they don't exist (safe migration)
    db.run(`ALTER TABLE cars ADD COLUMN head_image TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN gallery_images TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN booked_until TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN luggage TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN mileage INTEGER`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN drive TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN fuel_economy REAL`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN exterior_color TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN interior_color TEXT`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN rca_insurance_price REAL`, () => {});
    db.run(`ALTER TABLE cars ADD COLUMN casco_insurance_price REAL`, () => {});
    
    // Add columns to coupon_codes table if they don't exist (safe migration)
    db.run(`ALTER TABLE coupon_codes ADD COLUMN type TEXT DEFAULT 'percentage'`, () => {});
    db.run(`ALTER TABLE coupon_codes ADD COLUMN free_days INTEGER`, () => {});
    db.run(`ALTER TABLE coupon_codes ADD COLUMN wheel_enabled BOOLEAN DEFAULT 0`, () => {});
    
    // Create wheel_coupons junction table for many-to-many relationship
    db.run(`CREATE TABLE IF NOT EXISTS wheel_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wheel_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wheel_id) REFERENCES spinning_wheels (id) ON DELETE CASCADE,
      FOREIGN KEY (coupon_id) REFERENCES coupon_codes (id) ON DELETE CASCADE,
      UNIQUE(wheel_id, coupon_id)
    )`, () => {});
    
    // Remove coupon_type column from spinning_wheels table (migration)
    db.run(`CREATE TABLE IF NOT EXISTS spinning_wheels_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {});
    
    db.run(`INSERT INTO spinning_wheels_new (id, name, description, is_active, created_at) 
            SELECT id, name, description, is_active, created_at FROM spinning_wheels`, () => {});
    
    db.run(`DROP TABLE spinning_wheels`, () => {});
    db.run(`ALTER TABLE spinning_wheels_new RENAME TO spinning_wheels`, () => {});
    
    // Update existing coupon codes to have type 'percentage' and set free_days to NULL
    db.run(`UPDATE coupon_codes SET type = 'percentage', free_days = NULL WHERE type IS NULL`, () => {});
    
    // Insert default spinning wheels if they don't exist
    db.run(`INSERT OR IGNORE INTO spinning_wheels (name, description, is_active) VALUES 
      ('Percentage Discount Wheel', 'Wheel for percentage discount coupons', 1),
      ('Free Days Wheel', 'Wheel for free days coupons', 0)
    `, () => {});
  });
}

module.exports = {
  db,
  initializeDatabase
}; 