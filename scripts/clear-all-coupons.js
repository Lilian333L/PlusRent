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

// Function to clear all coupon codes
function clearAllCoupons() {
  console.log('🗑️  Starting to clear all coupon codes...');
  
  // First, let's see how many coupons we have
  db.get('SELECT COUNT(*) as count FROM coupon_codes', (err, result) => {
    if (err) {
      console.error('❌ Error counting coupons:', err.message);
      return;
    }
    
    const couponCount = result.count;
    console.log(`📊 Found ${couponCount} coupon codes in the database`);
    
    if (couponCount === 0) {
      console.log('✅ No coupon codes to delete. Database is already clean.');
      db.close();
      return;
    }
    
    // Show the coupons that will be deleted
    db.all('SELECT id, code, type, discount_percentage, free_days FROM coupon_codes', (err, coupons) => {
      if (err) {
        console.error('❌ Error fetching coupons:', err.message);
        return;
      }
      
      console.log('\n📋 Coupons that will be deleted:');
      coupons.forEach(coupon => {
        const details = coupon.type === 'percentage' 
          ? `${coupon.discount_percentage}% discount`
          : `${coupon.free_days} free days`;
        console.log(`   - ${coupon.code} (${details})`);
      });
      
      // Delete all coupon codes
      db.run('DELETE FROM coupon_codes', function(err) {
        if (err) {
          console.error('❌ Error deleting coupons:', err.message);
          return;
        }
        
        console.log(`\n✅ Successfully deleted ${this.changes} coupon codes from the database`);
        
        // Also clear the wheel_coupons junction table
        db.run('DELETE FROM wheel_coupons', function(err) {
          if (err) {
            console.error('❌ Error clearing wheel_coupons:', err.message);
          } else {
            console.log(`✅ Also cleared ${this.changes} wheel-coupon associations`);
          }
          
          // Verify the deletion
          db.get('SELECT COUNT(*) as count FROM coupon_codes', (err, result) => {
            if (err) {
              console.error('❌ Error verifying deletion:', err.message);
            } else {
              console.log(`\n🔍 Verification: ${result.count} coupon codes remaining in database`);
              if (result.count === 0) {
                console.log('✅ Database successfully cleared of all coupon codes!');
              } else {
                console.log('⚠️  Some coupon codes may still exist');
              }
            }
            
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('✅ Database connection closed');
                console.log('\n🎉 Ready to start fresh with dynamic coupon codes!');
              }
            });
          });
        });
      });
    });
  });
}

// Run the script
clearAllCoupons(); 