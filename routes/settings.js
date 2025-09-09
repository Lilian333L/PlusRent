const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');

// Get returning customer settings
router.get('/returning-customer', async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('global_settings')
      .select('*')
      .eq('setting_key', 'returning_customer_booking_trigger')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching returning customer settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings: ' + error.message });
    }

    // Return default value if no settings found
    const bookingTriggerNumber = settings ? parseInt(settings.setting_value) : 2;

    res.json({
      success: true,
      booking_trigger_number: bookingTriggerNumber
    });

  } catch (error) {
    console.error('❌ Error in returning customer settings GET:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Save returning customer settings
router.post('/returning-customer', async (req, res) => {
  const { booking_trigger_number } = req.body;

  if (!booking_trigger_number || booking_trigger_number < 1) {
    return res.status(400).json({ error: 'Booking trigger number must be a positive integer' });
  }

  try {
    // First, try to update existing setting
    const { data: existingSettings, error: updateError } = await supabase
      .from('global_settings')
      .update({
        setting_value: booking_trigger_number.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'returning_customer_booking_trigger')
      .select();

    if (updateError && updateError.code !== 'PGRST116') {
      console.error('❌ Error updating returning customer settings:', updateError);
      return res.status(500).json({ error: 'Failed to update settings: ' + updateError.message });
    }

    // If no existing setting found, create a new one
    if (!existingSettings || existingSettings.length === 0) {
      const { data: newSettings, error: insertError } = await supabase
        .from('global_settings')
        .insert({
          setting_key: 'returning_customer_booking_trigger',
          setting_value: booking_trigger_number.toString(),
          description: 'Booking interval that triggers returning customer popup (e.g., 2 = every 2nd booking)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('❌ Error creating returning customer settings:', insertError);
        return res.status(500).json({ error: 'Failed to create settings: ' + insertError.message });
      }
    }

    res.json({
      success: true,
      message: 'Returning customer settings saved successfully',
      booking_trigger_number: booking_trigger_number
    });

  } catch (error) {
    console.error('❌ Error in returning customer settings POST:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

module.exports = router;