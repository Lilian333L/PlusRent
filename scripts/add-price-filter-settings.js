const { supabaseAdmin } = require('../lib/supabaseClient');

async function addPriceFilterSettings() {
  try {
    console.log('🔧 Adding price filter settings to fee_settings table...');

    const priceFilterSettings = [
      {
        setting_key: 'economy_price_min',
        setting_name: 'Economy Price Range - Minimum',
        amount: 0,
        currency: 'EUR',
        description: 'Minimum price for economy category (€)',
        is_active: true
      },
      {
        setting_key: 'economy_price_max',
        setting_name: 'Economy Price Range - Maximum',
        amount: 30,
        currency: 'EUR',
        description: 'Maximum price for economy category (€)',
        is_active: true
      },
      {
        setting_key: 'standard_price_min',
        setting_name: 'Standard Price Range - Minimum',
        amount: 31,
        currency: 'EUR',
        description: 'Minimum price for standard category (€)',
        is_active: true
      },
      {
        setting_key: 'standard_price_max',
        setting_name: 'Standard Price Range - Maximum',
        amount: 60,
        currency: 'EUR',
        description: 'Maximum price for standard category (€)',
        is_active: true
      },
      {
        setting_key: 'premium_price_min',
        setting_name: 'Premium Price Range - Minimum',
        amount: 61,
        currency: 'EUR',
        description: 'Minimum price for premium category (€)',
        is_active: true
      },
      {
        setting_key: 'premium_price_max',
        setting_name: 'Premium Price Range - Maximum',
        amount: 999,
        currency: 'EUR',
        description: 'Maximum price for premium category (€)',
        is_active: true
      }
    ];

    for (const setting of priceFilterSettings) {
      const { data, error } = await supabaseAdmin
        .from('fee_settings')
        .insert(setting);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Setting ${setting.setting_key} already exists, skipping...`);
        } else {
          console.error(`❌ Error adding ${setting.setting_key}:`, error);
        }
      } else {
        console.log(`✅ Added ${setting.setting_key}: ${setting.setting_name}`);
      }
    }

    console.log('🎉 Price filter settings setup completed!');
  } catch (error) {
    console.error('❌ Error in addPriceFilterSettings:', error);
  }
}

// Run the function
addPriceFilterSettings(); 