const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabaseClient');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const feeSettingUpdateSchema = Joi.object({
  amount: Joi.number().min(0).max(1000).required(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(500).trim().allow(null, '').optional()
});

// Get all fee settings
router.get('/', async (req, res) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('fee_settings')
      .select('*')
      .order('setting_key');
    
    if (error) {
      console.error('Error fetching fee settings:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error in GET /fee-settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public fee settings (for frontend price calculation)
router.get('/public', async (req, res) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('fee_settings')
      .select('setting_key, amount, is_active')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching public fee settings:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Convert to a more convenient object format
    const feeMap = {};
    settings.forEach(setting => {
      feeMap[setting.setting_key] = setting.amount;
    });
    
    res.json(feeMap);
  } catch (error) {
    console.error('Error in GET /fee-settings/public:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ NEW: Get tariffs in specific format for frontend (no auth required)
router.get('/tariffs', async (req, res) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('fee_settings')
      .select('setting_key, amount, is_active')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching tariff settings:', error);
      // Возвращаем значения по умолчанию при ошибке
      return res.json({
        outside_working_hours_fee: '15',
        chisinau_airport_pickup: '25',
        chisinau_airport_dropoff: '25',
        iasi_airport_pickup: '35',
        iasi_airport_dropoff: '35'
      });
    }
    
    // Преобразуем в нужный формат с значениями по умолчанию
    const tariffs = {
      outside_working_hours_fee: '15',
      chisinau_airport_pickup: '25',
      chisinau_airport_dropoff: '25',
      iasi_airport_pickup: '35',
      iasi_airport_dropoff: '35'
    };
    
    // Обновляем значения из базы данных
    settings.forEach(setting => {
      switch(setting.setting_key) {
        case 'outside_hours_fee':
          tariffs.outside_working_hours_fee = String(setting.amount);
          break;
        case 'chisinau_airport_pickup':
          tariffs.chisinau_airport_pickup = String(setting.amount);
          break;
        case 'chisinau_airport_dropoff':
          tariffs.chisinau_airport_dropoff = String(setting.amount);
          break;
        case 'iasi_airport_pickup':
          tariffs.iasi_airport_pickup = String(setting.amount);
          break;
        case 'iasi_airport_dropoff':
          tariffs.iasi_airport_dropoff = String(setting.amount);
          break;
      }
    });
    
    console.log('✅ Tariffs sent to frontend:', tariffs);
    res.json(tariffs);
    
  } catch (error) {
    console.error('Error in GET /fee-settings/tariffs:', error);
    // Всегда возвращаем значения по умолчанию при ошибке
    res.json({
      outside_working_hours_fee: '15',
      chisinau_airport_pickup: '25',
      chisinau_airport_dropoff: '25',
      iasi_airport_pickup: '35',
      iasi_airport_dropoff: '35'
    });
  }
});

// Update a specific fee setting (Admin only)
router.patch('/:setting_key', authenticateToken, async (req, res) => {
  const { setting_key } = req.params;
  const { error: validationError, value } = feeSettingUpdateSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: validationError.details[0].message 
    });
  }
  
  const { amount, is_active, description } = value;
  
  try {
    // Check if setting exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('fee_settings')
      .select('id, setting_name')
      .eq('setting_key', setting_key)
      .single();
    
    if (checkError || !existing) {
      return res.status(404).json({ error: 'Fee setting not found' });
    }
    
    // Update the setting
    const updateData = { amount, updated_at: new Date().toISOString() };
    if (is_active !== undefined) updateData.is_active = is_active;
    if (description !== undefined) updateData.description = description;
    
    const { data, error: updateError } = await supabaseAdmin
      .from('fee_settings')
      .update(updateData)
      .eq('setting_key', setting_key)
      .select();
    
    if (updateError) {
      console.error('Error updating fee setting:', updateError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${existing.setting_name}`,
      data: data[0]
    });
    
  } catch (error) {
    console.error('Error in PATCH /fee-settings/:setting_key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update multiple fee settings (Admin only)
router.patch('/', authenticateToken, async (req, res) => {
  const { settings } = req.body;
  
  
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ error: 'Settings array is required' });
  }
  
  try {
    const results = [];
    const errors = [];
    
    // Define default settings for missing ones
    const defaultSettings = {
      'chisinau_airport_dropoff': { setting_name: 'Chișinău Airport Drop-off Fee', amount: 15.00, description: 'Fee for dropping off car at Chișinău Airport' },
      'chisinau_airport_pickup': { setting_name: 'Chișinău Airport Pickup Fee', amount: 15.00, description: 'Fee for picking up car from Chișinău Airport' },
      'iasi_airport_dropoff': { setting_name: 'Iași Airport Drop-off Fee', amount: 20.00, description: 'Fee for dropping off car at Iași Airport' },
      'iasi_airport_pickup': { setting_name: 'Iași Airport Pickup Fee', amount: 20.00, description: 'Fee for picking up car from Iași Airport' },
      'office_dropoff': { setting_name: 'Office Drop-off Fee', amount: 0.00, description: 'Fee for dropping off car at office (usually free)' },
      'office_pickup': { setting_name: 'Office Pickup Fee', amount: 0.00, description: 'Fee for picking up car from office (usually free)' },
      'outside_hours_fee': { setting_name: 'Outside Working Hours Fee', amount: 25.00, description: 'Additional fee for pickup/dropoff outside working hours' },
      'economy_price_min': { setting_name: 'Economy Price Minimum', amount: 30.00, description: 'Minimum price for economy cars' },
      'economy_price_max': { setting_name: 'Economy Price Maximum', amount: 80.00, description: 'Maximum price for economy cars' },
      'standard_price_min': { setting_name: 'Standard Price Minimum', amount: 80.00, description: 'Minimum price for standard cars' },
      'standard_price_max': { setting_name: 'Standard Price Maximum', amount: 150.00, description: 'Maximum price for standard cars' },
      'premium_price_min': { setting_name: 'Premium Price Minimum', amount: 150.00, description: 'Minimum price for premium cars' },
      'premium_price_max': { setting_name: 'Premium Price Maximum', amount: 500.00, description: 'Maximum price for premium cars' }
    };
    
    for (const setting of settings) {
      const { setting_key, amount, is_active, description } = setting;
      
      // Validate each setting
      const { error: validationError } = feeSettingUpdateSchema.validate({ amount, is_active, description });
      if (validationError) {
        errors.push({ setting_key, error: validationError.details[0].message });
        continue;
      }
      
      try {
        // First, try to update the existing setting
        const updateData = { 
          amount: Number(amount),
          updated_at: new Date().toISOString() 
        };
        if (is_active !== undefined) updateData.is_active = is_active;
        if (description !== undefined) updateData.description = description;
        
        const { data, error: updateError } = await supabaseAdmin
          .from('fee_settings')
          .update(updateData)
          .eq('setting_key', setting_key)
          .select();
        
        if (updateError) {
          console.error(`Update error for ${setting_key}:`, updateError);
          errors.push({ setting_key, error: updateError.message });
        } else if (data && data.length > 0) {
          // Update successful
          results.push(data[0]);
        } else {
          // Setting doesn't exist, create it
          const defaultSetting = defaultSettings[setting_key];
          if (defaultSetting) {
            const { data: newData, error: insertError } = await supabaseAdmin
              .from('fee_settings')
              .insert([{
                setting_key,
                setting_name: defaultSetting.setting_name,
                amount: Number(amount),
                is_active: is_active !== undefined ? is_active : true,
                description: description || defaultSetting.description
              }])
              .select();
            
            if (insertError) {
              console.error(`Insert error for ${setting_key}:`, insertError);
              errors.push({ setting_key, error: insertError.message });
            } else if (newData && newData.length > 0) {
              results.push(newData[0]);
            }
          } else {
            // No default setting defined, create a basic one
            const { data: newData, error: insertError } = await supabaseAdmin
              .from('fee_settings')
              .insert([{
                setting_key,
                setting_name: setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                amount: Number(amount),
                is_active: is_active !== undefined ? is_active : true,
                description: description || `Fee setting for ${setting_key}`
              }])
              .select();
            
            if (insertError) {
              console.error(`Insert error for ${setting_key}:`, insertError);
              errors.push({ setting_key, error: insertError.message });
            } else if (newData && newData.length > 0) {
              results.push(newData[0]);
            }
          }
        }
      } catch (settingError) {
        console.error(`Error processing setting ${setting_key}:`, settingError);
        errors.push({ setting_key, error: settingError.message });
      }
    }
    
    if (errors.length > 0) {
      console.error('Errors updating fee settings:', errors);
      return res.status(400).json({ 
        error: 'Some updates failed', 
        results,
        errors 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${results.length} fee settings`,
      data: results
    });
    
  } catch (error) {
    console.error('Error in PATCH /fee-settings (bulk):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize missing fee settings (Admin only)
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    // Define all the fee settings that should exist
    const allFeeSettings = [
      // Airport fees
      { setting_key: 'chisinau_airport_dropoff', setting_name: 'Chișinău Airport Drop-off Fee', amount: 15.00, description: 'Fee for dropping off car at Chișinău Airport' },
      { setting_key: 'chisinau_airport_pickup', setting_name: 'Chișinău Airport Pickup Fee', amount: 15.00, description: 'Fee for picking up car from Chișinău Airport' },
      { setting_key: 'iasi_airport_dropoff', setting_name: 'Iași Airport Drop-off Fee', amount: 20.00, description: 'Fee for dropping off car at Iași Airport' },
      { setting_key: 'iasi_airport_pickup', setting_name: 'Iași Airport Pickup Fee', amount: 20.00, description: 'Fee for picking up car from Iași Airport' },
      
      // Office fees
      { setting_key: 'office_dropoff', setting_name: 'Office Drop-off Fee', amount: 0.00, description: 'Fee for dropping off car at office (usually free)' },
      { setting_key: 'office_pickup', setting_name: 'Office Pickup Fee', amount: 0.00, description: 'Fee for picking up car from office (usually free)' },
      
      // Time-based fees
      { setting_key: 'outside_hours_fee', setting_name: 'Outside Working Hours Fee', amount: 25.00, description: 'Additional fee for pickup/dropoff outside working hours' },
      
      // Price filter settings
      { setting_key: 'economy_price_min', setting_name: 'Economy Price Minimum', amount: 30.00, description: 'Minimum price for economy cars' },
      { setting_key: 'economy_price_max', setting_name: 'Economy Price Maximum', amount: 80.00, description: 'Maximum price for economy cars' },
      { setting_key: 'standard_price_min', setting_name: 'Standard Price Minimum', amount: 80.00, description: 'Minimum price for standard cars' },
      { setting_key: 'standard_price_max', setting_name: 'Standard Price Maximum', amount: 150.00, description: 'Maximum price for standard cars' },
      { setting_key: 'premium_price_min', setting_name: 'Premium Price Minimum', amount: 150.00, description: 'Minimum price for premium cars' },
      { setting_key: 'premium_price_max', setting_name: 'Premium Price Maximum', amount: 500.00, description: 'Maximum price for premium cars' },
      
      // Existing settings (keep these as they are)
      { setting_key: 'delivery_fee', setting_name: 'Delivery Fee', amount: 25.00, description: 'Fee for car delivery to customer location' },
      { setting_key: 'late_return_fee', setting_name: 'Late Return Fee', amount: 50.00, description: 'Fee for returning car after scheduled time' },
      { setting_key: 'cleaning_fee', setting_name: 'Cleaning Fee', amount: 30.00, description: 'Fee for excessive cleaning required' },
      { setting_key: 'fuel_fee', setting_name: 'Fuel Fee', amount: 15.00, description: 'Fee for refueling service' },
      { setting_key: 'insurance_deposit', setting_name: 'Insurance Deposit', amount: 200.00, description: 'Refundable insurance deposit' }
    ];

    // Check what settings already exist
    const { data: existingSettings, error: fetchError } = await supabaseAdmin
      .from('fee_settings')
      .select('setting_key');
    
    if (fetchError) {
      console.error('Error fetching existing settings:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const existingKeys = existingSettings.map(s => s.setting_key);
    
    // Filter out settings that already exist
    const newSettings = allFeeSettings.filter(setting => !existingKeys.includes(setting.setting_key));
    
    if (newSettings.length === 0) {
      return res.json({ 
        success: true, 
        message: 'All fee settings already exist in database',
        data: existingSettings
      });
    }
    
    // Insert new settings
    const { data, error } = await supabaseAdmin
      .from('fee_settings')
      .insert(newSettings);
    
    if (error) {
      console.error('Error inserting fee settings:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ 
      success: true, 
      message: `Successfully initialized ${newSettings.length} fee settings`,
      data: newSettings
    });
    
  } catch (error) {
    console.error('Error in POST /fee-settings/initialize:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
