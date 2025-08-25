async function testApiResponse() {
  try {
    console.log('🧪 Testing cars API response...\n');
    
    // Test the cars API endpoint
    const response = await fetch('http://localhost:3000/api/cars');
    const cars = await response.json();
    
    console.log(`📋 API returned ${cars.length} cars:\n`);
    
    // Check the first few cars for their booked_until values
    cars.slice(0, 3).forEach((car, index) => {
      console.log(`🚗 Car ${index + 1}: ${car.make_name} ${car.model_name} (ID: ${car.id})`);
      console.log(`   booked: ${car.booked}`);
      console.log(`   booked_until: ${car.booked_until || 'null'}`);
      console.log('');
    });
    
    // Check if any cars have booked_until values
    const carsWithBookedUntil = cars.filter(car => car.booked_until);
    console.log(`📊 Cars with booked_until values: ${carsWithBookedUntil.length}/${cars.length}`);
    
    if (carsWithBookedUntil.length > 0) {
      console.log('\n🔍 Cars with booked_until values:');
      carsWithBookedUntil.forEach(car => {
        console.log(`   - ${car.make_name} ${car.model_name}: ${car.booked_until}`);
      });
    }
    
    console.log('\n✅ API response test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testApiResponse()
  .then(() => {
    console.log('🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 