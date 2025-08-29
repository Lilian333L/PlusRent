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
    
    console.log(`✅ Updated fee setting: ${existing.setting_name} = €${amount}`);
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
  
  console.log('🔍 Received settings to update:', settings.map(s => s.setting_key));
  
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ error: 'Settings array is required' });
  }
  
  try {
    const results = [];
    const errors = [];
    
    // First, let's check what exists in the database
    const { data: existingSettings, error: fetchError } = await supabaseAdmin
      .from('fee_settings')
      .select('setting_key, amount')
      .order('setting_key');
    
    if (fetchError) {
      console.error('Error fetching existing settings:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('🔍 Existing settings in DB:', existingSettings);
    
    // Test if we can find a specific record
    const testKey = 'outside_hours_fee';
    const { data: testRecord, error: testError } = await supabaseAdmin
      .from('fee_settings')
      .select('*')
      .eq('setting_key', testKey)
      .single();
    
    console.log(`🔍 Test query for ${testKey}:`, { data: testRecord, error: testError });
    
    for (const setting of settings) {
      const { setting_key, amount, is_active, description } = setting;
      
      // Validate each setting
      const { error: validationError } = feeSettingUpdateSchema.validate({ amount, is_active, description });
      if (validationError) {
        errors.push({ setting_key, error: validationError.details[0].message });
        continue;
      }
      
      // Update the setting - force updated_at to ensure some change
      const updateData = { 
        amount: Number(amount), // Ensure it's a number
        updated_at: new Date().toISOString() 
      };
      if (is_active !== undefined) updateData.is_active = is_active;
      if (description !== undefined) updateData.description = description;
      
      console.log(`Updating ${setting_key} with:`, updateData);
      
      const { data, error: updateError } = await supabaseAdmin
        .from('fee_settings')
        .update(updateData)
        .eq('setting_key', setting_key)
        .select();
      
      console.log(`Supabase result for ${setting_key}:`, { data, error: updateError });
      
      if (updateError) {
        console.error(`Update error for ${setting_key}:`, updateError);
        errors.push({ setting_key, error: updateError.message });
      } else {
        // Check if the record was actually found and updated
        if (data && data.length > 0) {
          console.log(`✅ Successfully updated ${setting_key}:`, data[0]);
          results.push(data[0]);
        } else {
          // No data returned - this means the record wasn't found
          console.log(`❌ No record found for setting_key: ${setting_key}`);
          errors.push({ setting_key, error: 'Setting not found' });
        }
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

module.exports = router; 