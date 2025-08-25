const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearBookedUntilValues() {
  try {
    console.log('🔍 Clearing booked_until values from cars table...');
    
    // Update all cars to clear booked_until and set booked to false
    const { data, error } = await supabase
      .from('cars')
      .update({ 
        booked: false, 
        booked_until: null,
        updated_at: new Date().toISOString()
      })
      .neq('id', 0); // Update all cars
    
    if (error) {
      console.error('❌ Error clearing booked_until values:', error);
      return;
    }
    
    console.log('✅ Successfully cleared booked_until values from all cars');
    console.log('📊 Updated cars count:', data?.length || 'unknown');
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('cars')
      .select('id, make_name, model_name, booked, booked_until')
      .limit(5);
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log('🔍 Verification - Sample cars after update:');
    verifyData.forEach(car => {
      console.log(`  - ${car.make_name} ${car.model_name} (ID: ${car.id}): booked=${car.booked}, booked_until=${car.booked_until}`);
    });
    
    console.log('\n✅ Clear operation completed successfully!');
    console.log('📝 Note: Car availability will now be calculated dynamically based on actual bookings');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
clearBookedUntilValues()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 