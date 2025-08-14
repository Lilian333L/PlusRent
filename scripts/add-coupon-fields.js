const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const db = new sqlite3.Database('./carrental.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Could not connect to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Function to add new fields to coupon_codes table
function addCouponFields() {
  console.log('🔧 Adding new fields to coupon_codes table...');
  
  // Check current table structure
  db.all("PRAGMA table_info(coupon_codes)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err.message);
      return;
    }
    
    console.log('\n📋 Current coupon_codes table structure:');
    columns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    // Check if fields already exist
    const existingColumns = columns.map(col => col.name);
    const needsAvailableCodes = !existingColumns.includes('available_codes');
    const needsShowedCodes = !existingColumns.includes('showed_codes');
    
    if (!needsAvailableCodes && !needsShowedCodes) {
      console.log('\n✅ Both fields already exist in the table');
      db.close();
      return;
    }
    
    // Add available_codes field if it doesn't exist
    if (needsAvailableCodes) {
      console.log('\n➕ Adding available_codes field...');
      db.run('ALTER TABLE coupon_codes ADD COLUMN available_codes INTEGER DEFAULT 0', function(err) {
        if (err) {
          console.error('❌ Error adding available_codes field:', err.message);
        } else {
          console.log('✅ Successfully added available_codes field');
        }
        
        // Add showed_codes field if it doesn't exist
        if (needsShowedCodes) {
          console.log('\n➕ Adding showed_codes field...');
          db.run('ALTER TABLE coupon_codes ADD COLUMN showed_codes INTEGER DEFAULT 0', function(err) {
            if (err) {
              console.error('❌ Error adding showed_codes field:', err.message);
            } else {
              console.log('✅ Successfully added showed_codes field');
            }
            
            // Verify the new structure
            verifyNewStructure();
          });
        } else {
          verifyNewStructure();
        }
      });
    } else if (needsShowedCodes) {
      console.log('\n➕ Adding showed_codes field...');
      db.run('ALTER TABLE coupon_codes ADD COLUMN showed_codes INTEGER DEFAULT 0', function(err) {
        if (err) {
          console.error('❌ Error adding showed_codes field:', err.message);
        } else {
          console.log('✅ Successfully added showed_codes field');
        }
        verifyNewStructure();
      });
    }
  });
}

// Function to verify the new table structure
function verifyNewStructure() {
  console.log('\n🔍 Verifying new table structure...');
  
  db.all("PRAGMA table_info(coupon_codes)", (err, columns) => {
    if (err) {
      console.error('❌ Error verifying table structure:', err.message);
      return;
    }
    
    console.log('\n📋 Updated coupon_codes table structure:');
    columns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    // Check if our new fields are present
    const columnNames = columns.map(col => col.name);
    const hasAvailableCodes = columnNames.includes('available_codes');
    const hasShowedCodes = columnNames.includes('showed_codes');
    
    if (hasAvailableCodes && hasShowedCodes) {
      console.log('\n✅ Database structure successfully updated!');
      console.log('   - available_codes: INTEGER DEFAULT 0');
      console.log('   - showed_codes: INTEGER DEFAULT 0');
    } else {
      console.log('\n⚠️  Some fields may not have been added successfully');
      if (!hasAvailableCodes) console.log('   - available_codes field missing');
      if (!hasShowedCodes) console.log('   - showed_codes field missing');
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('\n✅ Database connection closed');
        console.log('\n🎉 Ready to implement dynamic coupon functionality!');
      }
    });
  });
}

// Run the migration
addCouponFields(); 