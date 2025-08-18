const axios = require('axios');

// Set environment to use Supabase
process.env.VERCEL = '1';
process.env.VERCEL_ENV = 'production';

const API_BASE_URL = 'https://carrental-rho-rose.vercel.app';

async function testSupabaseFiltering() {
  console.log('🧪 Testing Supabase Car Filtering Logic...\n');
  console.log('🌐 Testing against:', API_BASE_URL);

  const tests = [
    {
      name: 'Single make filter',
      url: '/api/cars?make_name=BMW',
      expected: 'Should return BMW cars only'
    },
    {
      name: 'Multiple makes filter',
      url: '/api/cars?make_name=BMW,Mercedes',
      expected: 'Should return BMW OR Mercedes cars'
    },
    {
      name: 'Single gear type filter',
      url: '/api/cars?gear_type=Automatic',
      expected: 'Should return Automatic cars only'
    },
    {
      name: 'Multiple gear types filter',
      url: '/api/cars?gear_type=Automatic,Manual',
      expected: 'Should return Automatic OR Manual cars'
    },
    {
      name: 'Combined filters - multiple makes + single gear',
      url: '/api/cars?make_name=BMW,Mercedes&gear_type=Automatic',
      expected: 'Should return (BMW OR Mercedes) AND Automatic cars'
    },
    {
      name: 'Combined filters - multiple makes + multiple gears',
      url: '/api/cars?make_name=BMW,Mercedes&gear_type=Automatic,Manual',
      expected: 'Should return (BMW OR Mercedes) AND (Automatic OR Manual) cars'
    },
    {
      name: 'Complex filter - multiple makes + gear + fuel',
      url: '/api/cars?make_name=Audi,BMW,Mercedes&gear_type=Automatic&fuel_type=Petrol',
      expected: 'Should return (Audi OR BMW OR Mercedes) AND Automatic AND Petrol cars'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`📋 Test: ${test.name}`);
      console.log(`🔗 URL: ${test.url}`);
      console.log(`🎯 Expected: ${test.expected}`);
      
      const response = await axios.get(`${API_BASE_URL}${test.url}`);
      const cars = response.data;
      
      console.log(`✅ Response: ${cars.length} cars found`);
      
      if (cars.length > 0) {
        console.log('🚗 Sample cars:');
        cars.slice(0, 3).forEach(car => {
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
testSupabaseFiltering().catch(console.error); 