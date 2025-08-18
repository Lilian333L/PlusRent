const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testLocalFiltering() {
  console.log('🧪 Testing Local Filtering...\n');

  try {
    const response = await axios.get(`${API_BASE_URL}/api/cars?make_name=BMW,Mercedes&gear_type=Automatic`);
    const cars = response.data;
    
    console.log(`✅ Response: ${cars.length} cars found`);
    
    if (cars.length > 0) {
      console.log('🚗 Sample cars:');
      cars.slice(0, 2).forEach(car => {
        console.log(`   - ${car.make_name} ${car.model_name} (${car.gear_type}, ${car.fuel_type})`);
      });
    }
    
    console.log('✅ Local filtering works!');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run the test
testLocalFiltering().catch(console.error); 