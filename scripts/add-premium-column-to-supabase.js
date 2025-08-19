const { supabase } = require('../lib/supabaseClient');

async function addPremiumColumnToSupabase() {
  console.log('🔧 Adding is_premium column to Supabase cars table...');
  
  try {
    // Add the is_premium column to the cars table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE cars 
        ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
      `
    });
    
    if (error) {
      console.error('❌ Error adding is_premium column:', error);
      
      // Alternative approach using direct SQL
      console.log('🔄 Trying alternative approach...');
      
      // Since RPC might not work, we'll provide the SQL for manual execution
      console.log('\n📋 Please run this SQL in your Supabase SQL Editor:');
      console.log(`
        ALTER TABLE cars 
        ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
      `);
      
      return;
    }
    
    console.log('✅ is_premium column added successfully to Supabase!');
    
    // Update existing cars to have is_premium = false
    const { error: updateError } = await supabase
      .from('cars')
      .update({ is_premium: false })
      .is('is_premium', null);
    
    if (updateError) {
      console.log('⚠️  Warning: Could not update existing cars (this is normal if column was just added)');
    } else {
      console.log('✅ Updated existing cars with default is_premium = false');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please run this SQL in your Supabase SQL Editor:');
    console.log(`
      ALTER TABLE cars 
      ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
    `);
  }
}

// Run the script
addPremiumColumnToSupabase(); 