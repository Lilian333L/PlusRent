const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testLocalFilteringDebug() {
  console.log('🧪 Testing Local Filtering with Debug Output...\n');

  const tests = [
    {
      name: 'Combined filters - multiple makes + single gear',
      url: '/api/cars?make_name=BMW,Mercedes&gear_type=Automatic'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`📋 Test: ${test.name}`);
      console.log(`🔗 URL: ${test.url}`);
      
      const response = await axios.get(`${API_BASE_URL}${test.url}`);
      const cars = response.data;
      
      console.log(`✅ Response: ${cars.length} cars found`);
      
      if (cars.length > 0) {
        console.log('🚗 Sample cars:');
        cars.slice(0, 2).forEach(car => {
          console.log(`   - ${car.make_name} ${car.model_name} (${car.gear_type}, ${car.fuel_type})`);
        });
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('---\n');
    }
  }
}

// Run the tests
testLocalFilteringDebug().catch(console.error); 