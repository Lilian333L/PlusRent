const axios = require('axios');

// Set environment to use Supabase
process.env.VERCEL = '1';
process.env.VERCEL_ENV = 'production';

const API_BASE_URL = 'https://carrental-rho-rose.vercel.app';

async function testSupabaseFiltering() {
  console.log('🧪 Comprehensive Supabase Filtering Test...\n');
  console.log('🌐 Testing against:', API_BASE_URL);

  const tests = [
    {
      name: 'Single make filter',
      url: '/api/cars?make_name=BMW',
      expected: 'Should return BMW cars only',
      minResults: 1
    },
    {
      name: 'Multiple makes filter (should use first value)',
      url: '/api/cars?make_name=BMW,Mercedes',
      expected: 'Should return BMW cars (first value)',
      minResults: 1
    },
    {
      name: 'Single gear type filter',
      url: '/api/cars?gear_type=Automatic',
      expected: 'Should return Automatic cars only',
      minResults: 1
    },
    {
      name: 'Multiple gear types filter (should use first value)',
      url: '/api/cars?gear_type=Automatic,Manual',
      expected: 'Should return Automatic cars (first value)',
      minResults: 1
    },
    {
      name: 'Combined filters - multiple makes + single gear',
      url: '/api/cars?make_name=BMW,Mercedes&gear_type=Automatic',
      expected: 'Should return BMW AND Automatic cars',
      minResults: 1
    },
    {
      name: 'Combined filters - single make + multiple gears',
      url: '/api/cars?make_name=BMW&gear_type=Automatic,Manual',
      expected: 'Should return BMW AND Automatic cars',
      minResults: 1
    },
    {
      name: 'Complex filter - multiple makes + gear + fuel',
      url: '/api/cars?make_name=Audi,BMW,Mercedes&gear_type=Automatic&fuel_type=Petrol',
      expected: 'Should return Audi AND Automatic AND Petrol cars',
      minResults: 0
    }
  ];

  let allTestsPassed = true;

  for (const test of tests) {
    try {
      console.log(`📋 Test: ${test.name}`);
      console.log(`🔗 URL: ${test.url}`);
      console.log(`🎯 Expected: ${test.expected}`);
      
      const response = await axios.get(`${API_BASE_URL}${test.url}`);
      const cars = response.data;
      
      console.log(`✅ Response: ${cars.length} cars found`);
      
      if (cars.length >= test.minResults) {
        console.log('✅ Test PASSED');
        if (cars.length > 0) {
          console.log('🚗 Sample cars:');
          cars.slice(0, 2).forEach(car => {
            console.log(`   - ${car.make_name} ${car.model_name} (${car.gear_type}, ${car.fuel_type})`);
          });
        }
      } else {
        console.log('❌ Test FAILED - Not enough results');
        allTestsPassed = false;
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`❌ Test FAILED: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      allTestsPassed = false;
      console.log('---\n');
    }
  }

  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Supabase filtering is working correctly.');
    console.log('✅ Ready to deploy!');
  } else {
    console.log('❌ SOME TESTS FAILED! Need to fix before deploying.');
  }

  return allTestsPassed;
}

// Run the tests
testSupabaseFiltering().catch(console.error); 