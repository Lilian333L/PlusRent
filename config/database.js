const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const db = new sqlite3.Database('./carrental.db', (err) => {
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
      discount_percentage REAL NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
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
  });
}

module.exports = {
  db,
  initializeDatabase
}; 