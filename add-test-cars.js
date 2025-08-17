const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

// Helper function to make HTTPS requests
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    console.log(`🌐 Making ${method} request to: ${url.href}`);
    if (postData) {
      console.log('📤 Data:', postData);
    }

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log(`📡 Response status: ${res.statusCode}`);
        try {
          const parsedData = JSON.parse(rawData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: rawData });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test car data
const testCars = [
  {
    make_name: 'BMW',
    model_name: 'X5',
    production_year: 2023,
    gear_type: 'Automatic',
    fuel_type: 'Petrol',
    engine_capacity: 3.0,
    car_type: 'SUV',
    num_doors: 5,
    num_passengers: 7,
    price_policy: JSON.stringify({
      "1-2": "120",
      "3-7": "110",
      "8-20": "100",
      "21-45": "90",
      "46+": "80"
    }),
    booked: false,
    booked_until: null,
    head_image: null,
    gallery_images: null,
    description: 'Luxury SUV with premium features',
    luggage: 'Large',
    drive: 'AWD',
    air_conditioning: true,
    min_age: 25,
    deposit: 500,
    insurance_cost: 25,
    status: 'available'
  },
  {
    make_name: 'Mercedes',
    model_name: 'C-Class',
    production_year: 2022,
    gear_type: 'Automatic',
    fuel_type: 'Petrol',
    engine_capacity: 2.0,
    car_type: 'Sedan',
    num_doors: 4,
    num_passengers: 5,
    price_policy: JSON.stringify({
      "1-2": "100",
      "3-7": "90",
      "8-20": "80",
      "21-45": "70",
      "46+": "60"
    }),
    booked: false,
    booked_until: null,
    head_image: null,
    gallery_images: null,
    description: 'Elegant sedan with modern technology',
    luggage: 'Medium',
    drive: 'RWD',
    air_conditioning: true,
    min_age: 23,
    deposit: 400,
    insurance_cost: 20,
    status: 'available'
  },
  {
    make_name: 'Audi',
    model_name: 'A4',
    production_year: 2023,
    gear_type: 'Automatic',
    fuel_type: 'Diesel',
    engine_capacity: 2.0,
    car_type: 'Sedan',
    num_doors: 4,
    num_passengers: 5,
    price_policy: JSON.stringify({
      "1-2": "95",
      "3-7": "85",
      "8-20": "75",
      "21-45": "65",
      "46+": "55"
    }),
    booked: false,
    booked_until: null,
    head_image: null,
    gallery_images: null,
    description: 'Sporty sedan with quattro all-wheel drive',
    luggage: 'Medium',
    drive: 'AWD',
    air_conditioning: true,
    min_age: 24,
    deposit: 450,
    insurance_cost: 22,
    status: 'available'
  }
];

// Add cars to database
async function addTestCars() {
  console.log('🚗 Adding test cars to Supabase...\n');
  
  for (let i = 0; i < testCars.length; i++) {
    const car = testCars[i];
    console.log(`📝 Adding car ${i + 1}/${testCars.length}: ${car.make_name} ${car.model_name}`);
    
    try {
      const result = await makeRequest('POST', 'cars', car);
      
      if (result.status === 201) {
        console.log(`✅ Successfully added: ${car.make_name} ${car.model_name}`);
      } else {
        console.log(`❌ Failed to add: ${car.make_name} ${car.model_name}`);
        console.log('Response:', result.data);
      }
    } catch (error) {
      console.error(`❌ Error adding ${car.make_name} ${car.model_name}:`, error.message);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🎉 Finished adding test cars!');
  
  // Verify the cars were added
  console.log('\n🔍 Verifying cars in database...');
  try {
    const result = await makeRequest('GET', 'cars');
    console.log(`📊 Found ${Array.isArray(result.data) ? result.data.length : 0} cars in database`);
    if (Array.isArray(result.data) && result.data.length > 0) {
      result.data.forEach(car => {
        console.log(`  - ${car.make_name} ${car.model_name} (ID: ${car.id})`);
      });
    }
  } catch (error) {
    console.error('❌ Error verifying cars:', error.message);
  }
}

// Run the script
addTestCars().catch(console.error); 