async function testDateComparison() {
  try {
    console.log('🧪 Testing date comparison logic...\n');
    
    // Get current date
    const now = new Date();
    console.log(`📅 Current date: ${now.toISOString().split('T')[0]}`);
    console.log(`📅 Current date (local): ${now.toLocaleDateString()}`);
    
    // Test the cars API endpoint
    const response = await fetch('http://localhost:3000/api/cars');
    const cars = await response.json();
    
    // Find the Audi A4 (ID: 7)
    const audi = cars.find(car => car.id === 7);
    if (audi) {
      console.log(`\n🚗 Audi A4 (ID: 7):`);
      console.log(`   booked: ${audi.booked}`);
      console.log(`   booked_until: ${audi.booked_until || 'null'}`);
      
      if (audi.booked_until) {
        const bookedUntil = new Date(audi.booked_until);
        console.log(`   booked_until date: ${bookedUntil.toISOString().split('T')[0]}`);
        console.log(`   booked_until (local): ${bookedUntil.toLocaleDateString()}`);
        
        // Test the same logic as the frontend
        const isUnavailable = audi.booked_until && (() => {
          const bookedUntil = new Date(audi.booked_until);
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Compare dates only
          bookedUntil.setHours(0, 0, 0, 0); // Compare dates only
          return bookedUntil >= now; // Only unavailable if booked until today or future
        })();
        
        console.log(`   isUnavailable (frontend logic): ${isUnavailable}`);
        console.log(`   Comparison: ${bookedUntil.toISOString().split('T')[0]} >= ${now.toISOString().split('T')[0]} = ${bookedUntil >= now}`);
      }
    }
    
    // Check all cars with booked_until values
    console.log('\n📊 All cars with booked_until values:');
    cars.filter(car => car.booked_until).forEach(car => {
      const bookedUntil = new Date(car.booked_until);
      const isUnavailable = bookedUntil >= now;
      console.log(`   - ${car.make_name} ${car.model_name}: ${car.booked_until} (unavailable: ${isUnavailable})`);
    });
    
    console.log('\n✅ Date comparison test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDateComparison()
  .then(() => {
    console.log('🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 