const axios = require('axios');

// Set environment to use Supabase
process.env.VERCEL = '1';
process.env.VERCEL_ENV = 'production';

const API_BASE_URL = 'https://carrental-rho-rose.vercel.app';

async function testSupabaseDebug() {
  console.log('🧪 Testing Supabase Filtering with Debug Output...\n');
  console.log('🌐 Testing against:', API_BASE_URL);

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
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      console.log('---\n');
    }
  }
}

// Run the tests
testSupabaseDebug().catch(console.error); 