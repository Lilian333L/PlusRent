const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to check if a car is currently unavailable and when it will be available
async function getNextAvailableDate(carId) {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Compare dates only
    
    // Get all CONFIRMED bookings for this car (only confirmed bookings make car unavailable)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('pickup_date, return_date')
      .eq('car_id', carId)
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error fetching bookings for availability check:', error);
      return null;
    }

    if (!bookings || bookings.length === 0) {
      return null; // Available now
    }

    // Check if car is currently being used (between pickup and return dates)
    const currentBookings = bookings.filter(booking => {
      const pickupDate = new Date(booking.pickup_date);
      const returnDate = new Date(booking.return_date);
      pickupDate.setHours(0, 0, 0, 0);
      returnDate.setHours(0, 0, 0, 0);
      
      // Car is currently being used if current date is between pickup and return dates
      return currentDate >= pickupDate && currentDate <= returnDate;
    });

    if (currentBookings.length > 0) {
      // Car is currently being used, find the latest return date
      const latestReturnDate = new Date(Math.max(...currentBookings.map(b => new Date(b.return_date))));
      latestReturnDate.setHours(0, 0, 0, 0);
      
      // Add one day to get the next available date
      const nextAvailable = new Date(latestReturnDate);
      nextAvailable.setDate(nextAvailable.getDate() + 1);
      
      return nextAvailable;
    }

    // Car is not currently being used and no current bookings
    // Don't return future booking dates - car is available now
    return null;

    // No current or future bookings, car is available
    return null;
  } catch (error) {
    console.error('Error in getNextAvailableDate:', error);
    return null;
  }
}

async function testAvailabilityCalculation() {
  try {
    console.log('🧪 Testing availability calculation...\n');
    
    // Get a few cars to test
    const { data: cars, error } = await supabase
      .from('cars')
      .select('id, make_name, model_name, booked, booked_until')
      .limit(3);
    
    if (error) {
      console.error('❌ Error fetching cars:', error);
      return;
    }
    
    console.log(`📋 Testing ${cars.length} cars:\n`);
    
    for (const car of cars) {
      console.log(`🚗 Testing car: ${car.make_name} ${car.model_name} (ID: ${car.id})`);
      console.log(`   Current booked status: ${car.booked}`);
      console.log(`   Current booked_until: ${car.booked_until || 'null'}`);
      
      // Get CONFIRMED bookings for this car (only confirmed bookings affect availability)
      const { data: confirmedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('pickup_date, return_date, status')
        .eq('car_id', car.id)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        console.error(`   ❌ Error fetching bookings:`, bookingsError);
        continue;
      }
      
      console.log(`   📅 Found ${confirmedBookings.length} CONFIRMED bookings:`);
      confirmedBookings.forEach(booking => {
        console.log(`      - ${booking.status}: ${booking.pickup_date} to ${booking.return_date}`);
      });
      
      // Calculate next available date
      const nextAvailable = await getNextAvailableDate(car.id);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      console.log(`   📅 Next available date: ${nextAvailable ? nextAvailable.toISOString().split('T')[0] : 'Now'}`);
      
      // Check if car should be unavailable
      if (nextAvailable) {
        console.log(`   ❌ Car should be unavailable until: ${nextAvailable.toISOString().split('T')[0]}`);
      } else {
        console.log(`   ✅ Car should be available now`);
      }
      
      console.log('');
    }
    
    console.log('✅ Availability calculation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAvailabilityCalculation()
  .then(() => {
    console.log('🏁 Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  }); 