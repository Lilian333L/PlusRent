const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'carrental.db');

console.log('🔧 Adding wheel_coupons table to SQLite database...');
console.log('📁 Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Create wheel_coupons table
const createWheelCouponsTable = `
CREATE TABLE IF NOT EXISTS wheel_coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wheel_id INTEGER NOT NULL,
  coupon_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  percentage DECIMAL(5,2) DEFAULT 0,
  FOREIGN KEY (wheel_id) REFERENCES spinning_wheels (id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupon_codes (id) ON DELETE CASCADE,
  UNIQUE(wheel_id, coupon_id)
);`;

db.run(createWheelCouponsTable, function(err) {
  if (err) {
    console.error('❌ Error creating wheel_coupons table:', err.message);
  } else {
    console.log('✅ wheel_coupons table created successfully');
    console.log('📊 Table changes:', this.changes);
  }
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
      console.log('\n🎉 wheel_coupons table has been added to the database!');
    }
  });
}); 