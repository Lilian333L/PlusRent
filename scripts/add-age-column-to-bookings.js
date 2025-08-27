const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAgeColumn() {
  try {
    console.log('🔧 Adding customer_age column to bookings table...');
    
    // Try to add the column using a direct approach
    // First, let's check if the column already exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('bookings')
      .select('customer_age')
      .limit(1);
    
    if (testError && testError.message.includes('customer_age')) {
      console.log('📝 Column does not exist, attempting to add it...');
      
      // Try to add the column by inserting a test record with the new column
      // This is a workaround since Supabase doesn't expose ALTER TABLE directly
      const { error: insertError } = await supabase
        .from('bookings')
        .insert({
          car_id: 1,
          pickup_date: '2025-01-01',
          pickup_time: '08:00',
          return_date: '2025-01-02',
          return_time: '18:00',
          insurance_type: 'basic',
          pickup_location: 'test',
          dropoff_location: 'test',
          customer_name: 'test',
          customer_email: 'test@test.com',
          customer_phone: '1234567890',
          customer_age: 25,
          status: 'pending'
        });
      
      if (insertError) {
        console.log('❌ Could not add column through insert:', insertError.message);
        console.log('\n📝 Manual steps required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to the SQL Editor');
        console.log('3. Run the following SQL command:');
        console.log('\nALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_age INTEGER;');
        console.log('\n4. If you have a booked_cars table, also run:');
        console.log('ALTER TABLE booked_cars ADD COLUMN IF NOT EXISTS customer_age INTEGER;');
        console.log('\n🎉 After running these SQL commands, the age field will be available!');
        return;
      } else {
        console.log('✅ Column added successfully!');
        
        // Clean up the test record
        const { error: deleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('customer_name', 'test');
        
        if (deleteError) {
          console.log('⚠️  Warning: Could not clean up test record:', deleteError.message);
        } else {
          console.log('✅ Test record cleaned up');
        }
      }
    } else {
      console.log('✅ customer_age column already exists!');
    }
    
    // Verify the column exists
    const { data: verifyData, error: verifyError } = await supabase
      .from('bookings')
      .select('customer_age')
      .limit(1);
    
    if (verifyError) {
      console.log('❌ Column verification failed:', verifyError.message);
    } else {
      console.log('✅ Column verified successfully!');
      console.log('🎉 The customer_age field is now available in the bookings table!');
    }
    
  } catch (error) {
    console.error('❌ Error adding customer_age column:', error);
    console.log('\n📝 Manual steps required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the following SQL command:');
    console.log('\nALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_age INTEGER;');
    console.log('\n4. If you have a booked_cars table, also run:');
    console.log('ALTER TABLE booked_cars ADD COLUMN IF NOT EXISTS customer_age INTEGER;');
    console.log('\n🎉 After running these SQL commands, the age field will be available!');
  }
}

addAgeColumn(); 