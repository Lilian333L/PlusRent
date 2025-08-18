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

    console.log(`🌐 Making ${method} request to: ${url.pathname + url.search}`);
    if (data) {
      console.log('📝 Request data:', data);
    }

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`);
        try {
          const parsedData = JSON.parse(rawData);
          console.log('📄 Response data:', parsedData);
          resolve(parsedData);
        } catch (e) {
          console.log('📄 Raw response:', rawData);
          resolve(rawData);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Request error:', e);
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testBookingCreation() {
  console.log('🧪 Testing booking creation in Supabase...\n');

  // Test 1: Check if bookings table exists and get current bookings
  console.log('1️⃣ Checking existing bookings...');
  try {
    const existingBookings = await makeRequest('GET', 'bookings');
    console.log(`Found ${Array.isArray(existingBookings) ? existingBookings.length : 0} existing bookings\n`);
  } catch (error) {
    console.error('❌ Error checking existing bookings:', error.message);
  }

  // Test 2: Check if cars table exists and get a car ID
  console.log('2️⃣ Checking cars table...');
  try {
    const cars = await makeRequest('GET', 'cars');
    if (Array.isArray(cars) && cars.length > 0) {
      const testCar = cars[0];
      console.log(`Found car: ${testCar.make_name} ${testCar.model_name} (ID: ${testCar.id})\n`);
      
      // Test 3: Create a test booking
      console.log('3️⃣ Creating test booking...');
      const testBooking = {
        car_id: testCar.id,
        pickup_date: '2024-01-15',
        pickup_time: '10:00',
        return_date: '2024-01-17',
        return_time: '18:00',
        discount_code: null,
        insurance_type: 'basic',
        pickup_location: 'Test Location',
        dropoff_location: 'Test Dropoff',
        customer_name: 'Test User',
        customer_phone: '+1234567890',
        special_instructions: 'Test booking for debugging',
        total_price: 150.00,
        price_breakdown: JSON.stringify({daily: 75, days: 2}),
        status: 'pending',
        created_at: new Date().toISOString()
      };

      try {
        const result = await makeRequest('POST', 'bookings', testBooking);
        console.log('✅ Test booking created successfully!');
        console.log('📋 Booking result:', result);
        
        // Test 4: Verify the booking was created
        console.log('\n4️⃣ Verifying booking was created...');
        const verifyBookings = await makeRequest('GET', 'bookings');
        console.log(`Total bookings after creation: ${Array.isArray(verifyBookings) ? verifyBookings.length : 0}`);
        
        if (Array.isArray(verifyBookings)) {
          const newBooking = verifyBookings.find(b => b.customer_name === 'Test User');
          if (newBooking) {
            console.log('✅ New booking found in database!');
            console.log('📋 Booking details:', newBooking);
          } else {
            console.log('❌ New booking not found in database');
          }
        }
        
      } catch (error) {
        console.error('❌ Error creating test booking:', error.message);
      }
    } else {
      console.log('❌ No cars found in database');
    }
  } catch (error) {
    console.error('❌ Error checking cars:', error.message);
  }

  console.log('\n🏁 Test completed!');
}

// Run the test
testBookingCreation().catch(console.error); 