const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'carrental.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding coupon fields to cars table...');

// Add coupon-related fields to cars table
db.serialize(() => {
  // Add new columns for coupon functionality
  db.run(`ALTER TABLE cars ADD COLUMN rca_insurance_price REAL DEFAULT 0`);
  db.run(`ALTER TABLE cars ADD COLUMN casco_insurance_price REAL DEFAULT 0`);
  db.run(`ALTER TABLE cars ADD COLUMN display_order INTEGER DEFAULT 0`);
  
  console.log('Added rca_insurance_price column');
  console.log('Added casco_insurance_price column');
  console.log('Added display_order column');
  
  // Update existing cars with default values
  db.run(`UPDATE cars SET rca_insurance_price = 0 WHERE rca_insurance_price IS NULL`);
  db.run(`UPDATE cars SET casco_insurance_price = 0 WHERE casco_insurance_price IS NULL`);
  db.run(`UPDATE cars SET display_order = id WHERE display_order IS NULL`);
  
  console.log('Updated existing cars with default values');
  
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed successfully');
      console.log('Coupon fields added successfully!');
    }
  });
}); 