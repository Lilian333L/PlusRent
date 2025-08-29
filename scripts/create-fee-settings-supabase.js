iconst { supabaseAdmin } = require('../lib/supabaseClient');

async function createFeeSettingsTable() {
  console.log('🚀 Creating fee_settings table using Supabase Admin...');
  
  try {
    // First, let's try to insert default data to see if table exists
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from('fee_settings')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') {
      console.log('❌ Table does not exist. Please create it manually in Supabase Dashboard.');
      console.log('\n📋 SQL to create the table:');
      console.log(`
CREATE TABLE fee_settings (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fee_settings_key ON fee_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_fee_settings_active ON fee_settings(is_active);
      `);
      return;
    }
    
    // If table exists, insert/update default data
    const defaultSettings = [
      {
        setting_key: 'outside_hours_fee',
        setting_name: 'Outside Working Hours Fee',
        amount: 15.00,
        description: 'Fee charged for pickup/dropoff outside working hours (8:00-18:00)'
      },
      {
        setting_key: 'chisinau_airport_pickup',
        setting_name: 'Chisinau Airport Pickup',
        amount: 0.00,
        description: 'Fee for pickup from Chisinau Airport'
      },
      {
        setting_key: 'chisinau_airport_dropoff',
        setting_name: 'Chisinau Airport Dropoff',
        amount: 25.00,
        description: 'Fee for dropoff at Chisinau Airport'
      },
      {
        setting_key: 'iasi_airport_pickup',
        setting_name: 'Iasi Airport Pickup',
        amount: 35.00,
        description: 'Fee for pickup from Iasi Airport'
      },
      {
        setting_key: 'iasi_airport_dropoff',
        setting_name: 'Iasi Airport Dropoff',
        amount: 35.00,
        description: 'Fee for dropoff at Iasi Airport'
      },
      {
        setting_key: 'office_pickup',
        setting_name: 'Office Pickup',
        amount: 0.00,
        description: 'Fee for pickup from office (always free)'
      },
      {
        setting_key: 'office_dropoff',
        setting_name: 'Office Dropoff',
        amount: 0.00,
        description: 'Fee for dropoff at office (always free)'
      }
    ];
    
    console.log('📊 Inserting default fee settings...');
    
    for (const setting of defaultSettings) {
      // Try to insert, if conflict then update
      const { error: insertError } = await supabaseAdmin
        .from('fee_settings')
        .upsert(setting, { 
          onConflict: 'setting_key',
          ignoreDuplicates: false 
        });
      
      if (insertError) {
        console.error(`❌ Error inserting ${setting.setting_key}:`, insertError);
      } else {
        console.log(`✅ Upserted setting: ${setting.setting_name} = €${setting.amount}`);
      }
    }
    
    // Verify the settings were created
    const { data: settings, error: selectError } = await supabaseAdmin
      .from('fee_settings')
      .select('*')
      .order('setting_key');
    
    if (selectError) {
      console.error('❌ Error verifying fee_settings:', selectError);
      return;
    }
    
    console.log('\n📊 Current fee settings:');
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