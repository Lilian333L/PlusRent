const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const db = new sqlite3.Database('./carrental.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Clear past bookings automatically
function clearPastBookings() {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  console.log('Checking for past bookings...');
  console.log('Current date:', currentDate.toISOString().split('T')[0]);
  
  db.all('SELECT id, make_name, model_name, booked_until FROM cars WHERE booked_until IS NOT NULL', (err, cars) => {
    if (err) {
      console.error('Error fetching cars:', err);
      return;
    }
    
    let clearedCount = 0;
    
    cars.forEach(car => {
      if (car.booked_until) {
        const bookedUntil = new Date(car.booked_until);
        bookedUntil.setHours(0, 0, 0, 0);
        
        // If booked_until is in the past, clear the booking
        if (bookedUntil < currentDate) {
          console.log(`Clearing past booking for ${car.make_name} ${car.model_name} (ID: ${car.id}) - was booked until ${car.booked_until}`);
          
          db.run('UPDATE cars SET booked = 0, booked_until = NULL WHERE id = ?', [car.id], (updateErr) => {
            if (updateErr) {
              console.error(`Error updating car ${car.id}:`, updateErr);
            } else {
              clearedCount++;
              console.log(`✓ Successfully cleared booking for car ${car.id}`);
            }
          });
        } else {
          console.log(`Keeping booking for ${car.make_name} ${car.model_name} (ID: ${car.id}) - booked until ${car.booked_until} (future date)`);
        }
      }
    });
    
    // Close database after all updates
    setTimeout(() => {
      console.log(`\nSummary: Cleared ${clearedCount} past bookings`);
      db.close();
      console.log('Database connection closed');
      process.exit(0);
    }, 1000);
  });
}

// Run the cleanup
clearPastBookings(); 