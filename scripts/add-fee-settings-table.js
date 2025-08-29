const { supabase } = require('../lib/supabaseClient');

async function createFeeSettingsTable() {
  console.log('🚀 Creating fee_settings table...');
  
  try {
    // Create the fee_settings table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS fee_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(50) UNIQUE NOT NULL,
          setting_name VARCHAR(100) NOT NULL,
          amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          currency VARCHAR(3) DEFAULT 'EUR',
          is_active BOOLEAN DEFAULT true,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert default fee settings
        INSERT INTO fee_settings (setting_key, setting_name, amount, description) VALUES
        ('outside_hours_fee', 'Outside Working Hours Fee', 15.00, 'Fee charged for pickup/dropoff outside working hours (8:00-18:00)'),
        ('chisinau_airport_pickup', 'Chisinau Airport Pickup', 0.00, 'Fee for pickup from Chisinau Airport (free as per requirements)'),
        ('chisinau_airport_dropoff', 'Chisinau Airport Dropoff', 25.00, 'Fee for dropoff at Chisinau Airport'),
        ('iasi_airport_pickup', 'Iasi Airport Pickup', 35.00, 'Fee for pickup from Iasi Airport'),
        ('iasi_airport_dropoff', 'Iasi Airport Dropoff', 35.00, 'Fee for dropoff at Iasi Airport'),
        ('office_pickup', 'Office Pickup', 0.00, 'Fee for pickup from office (always free)'),
        ('office_dropoff', 'Office Dropoff', 0.00, 'Fee for dropoff at office (always free)')
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_name = EXCLUDED.setting_name,
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP;
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_fee_settings_key ON fee_settings(setting_key);
        CREATE INDEX IF NOT EXISTS idx_fee_settings_active ON fee_settings(is_active);
      `
    });
    
    if (createError) {
      console.error('❌ Error creating fee_settings table:', createError);
      return;
    }
    
    console.log('✅ fee_settings table created successfully');
    
    // Verify the table was created and data inserted
    const { data: settings, error: selectError } = await supabase
      .from('fee_settings')
      .select('*')
      .order('setting_key');
    
    if (selectError) {
      console.error('❌ Error verifying fee_settings:', selectError);
      return;
    }
    
    console.log('📊 Current fee settings:');
    settings.forEach(setting => {
      console.log(`  ${setting.setting_name}: €${setting.amount} (${setting.setting_key})`);
    });
    
  } catch (error) {
    console.error('❌ Error in createFeeSettingsTable:', error);
  }
}

// Run if called directly
if (require.main === module) {
  createFeeSettingsTable().then(() => {
    console.log('✅ Fee settings setup completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { createFeeSettingsTable }; 