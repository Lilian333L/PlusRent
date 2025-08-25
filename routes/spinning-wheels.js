const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { supabase } = require('../lib/supabaseClient');

// Get all spinning wheels
router.get('/', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheels fetch');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error fetching spinning wheels:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('✅ Spinning wheels fetched successfully from Supabase');
      res.json(data || []);
      
    } catch (error) {
      console.error('❌ Supabase error fetching spinning wheels:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.all('SELECT * FROM spinning_wheels ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
  }
});

// Get all active spinning wheels
router.get('/active', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for active spinning wheels fetch');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error fetching active spinning wheels:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('✅ Active spinning wheels fetched successfully from Supabase');
      res.json(data || []);
      
    } catch (error) {
      console.error('❌ Supabase error fetching active spinning wheels:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    db.all('SELECT * FROM spinning_wheels WHERE is_active = 1 ORDER BY created_at DESC', (err, wheels) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(wheels || []);
    });
  }
});

// Secure endpoint for spinning wheel data (minimal data exposure)
router.get('/secure/active-data', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for secure active wheel data fetch');
      
      // Get first active wheel (for backward compatibility)
      const { data: activeWheels, error: wheelError } = await supabase
        .from('spinning_wheels')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (wheelError || !activeWheels || activeWheels.length === 0) {
        console.log('No active spinning wheel found');
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      const activeWheel = activeWheels[0];
      
      // Get wheel coupons (only coupon_id, no sensitive data)
      const { data: wheelCoupons, error: wheelCouponsError } = await supabase
        .from('wheel_coupons')
        .select('coupon_id')
        .eq('wheel_id', activeWheel.id);
      
      if (wheelCouponsError) {
        console.error('❌ Supabase error fetching wheel coupons:', wheelCouponsError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get active coupons with minimal data
      const enabledCouponIds = wheelCoupons.map(wc => wc.coupon_id);
      
      if (enabledCouponIds.length === 0) {
        return res.json({ segments: [] });
      }
      
      const { data: coupons, error: couponsError } = await supabase
        .from('coupon_codes')
        .select('id, type, discount_percentage, free_days, code')
        .in('id', enabledCouponIds)
        .eq('is_active', true)
        .order('id', { ascending: true });
      
      if (couponsError) {
        console.error('❌ Supabase error fetching coupons:', couponsError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Create secure segments with minimal data
      const segments = coupons.map((coupon, index) => {
        let text;
        if (coupon.type === 'percentage') {
          text = `${coupon.discount_percentage}%`;
        } else if (coupon.type === 'free_days') {
          text = `${coupon.free_days} ${coupon.free_days === 1 ? 'DAY' : 'DAYS'}`;
        } else {
          text = `${coupon.discount_percentage}%`;
        }
        
        return {
          index: index,
          text: text,
          type: coupon.type,
          value: coupon.type === 'percentage' ? coupon.discount_percentage : coupon.free_days,
          coupon_id: coupon.id,
          code: coupon.code
        };
      });
      
      console.log('✅ Secure wheel data fetched successfully');
      res.json({ segments: segments });
      
    } catch (error) {
      console.error('❌ Supabase error fetching secure wheel data:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    // Use SQLite
    db.get('SELECT id FROM spinning_wheels WHERE is_active = 1', (err, wheel) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      // Get wheel coupons
      db.all('SELECT coupon_id FROM wheel_coupons WHERE wheel_id = ?', [wheel.id], (err, wheelCoupons) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        const enabledCouponIds = wheelCoupons.map(wc => wc.coupon_id);
        
        if (enabledCouponIds.length === 0) {
          return res.json({ segments: [] });
        }
        
        const placeholders = enabledCouponIds.map(() => '?').join(',');
        db.all(
          `SELECT id, type, discount_percentage, free_days, code 
           FROM coupon_codes 
           WHERE id IN (${placeholders}) AND is_active = 1 
           ORDER BY id ASC`,
          enabledCouponIds,
          (err, coupons) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            const segments = coupons.map((coupon, index) => {
              let text;
              if (coupon.type === 'percentage') {
                text = `${coupon.discount_percentage}%`;
              } else if (coupon.type === 'free_days') {
                text = `${coupon.free_days} ${coupon.free_days === 1 ? 'DAY' : 'DAYS'}`;
              } else {
                text = `${coupon.discount_percentage}%`;
              }
              
              return {
                index: index,
                text: text,
                type: coupon.type,
                value: coupon.type === 'percentage' ? coupon.discount_percentage : coupon.free_days,
                coupon_id: coupon.id,
                code: coupon.code
              };
            });
            
            res.json({ segments: segments });
          }
        );
      });
    });
  }
});

// Secure endpoint for specific wheel data (minimal data exposure)
router.get('/:id/secure-data', async (req, res) => {
  const wheelId = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log(`🔍 Using Supabase for secure wheel data fetch for wheel ${wheelId}`);
      
      // Check if wheel exists
      const { data: wheel, error: wheelError } = await supabase
        .from('spinning_wheels')
        .select('id')
        .eq('id', wheelId)
        .single();
      
      if (wheelError || !wheel) {
        console.log(`Wheel ${wheelId} not found`);
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      // Get wheel coupons (only coupon_id, no sensitive data)
      const { data: wheelCoupons, error: wheelCouponsError } = await supabase
        .from('wheel_coupons')
        .select('coupon_id')
        .eq('wheel_id', wheelId);
      
      if (wheelCouponsError) {
        console.error('❌ Supabase error fetching wheel coupons:', wheelCouponsError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get active coupons with minimal data
      const enabledCouponIds = wheelCoupons.map(wc => wc.coupon_id);
      
      if (enabledCouponIds.length === 0) {
        return res.json({ segments: [] });
      }
      
      const { data: coupons, error: couponsError } = await supabase
        .from('coupon_codes')
        .select('id, type, discount_percentage, free_days, code')
        .in('id', enabledCouponIds)
        .eq('is_active', true)
        .order('id', { ascending: true });
      
      if (couponsError) {
        console.error('❌ Supabase error fetching coupons:', couponsError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Create secure segments with minimal data
      const segments = coupons.map((coupon, index) => {
        let text;
        if (coupon.type === 'percentage') {
          text = `${coupon.discount_percentage}%`;
        } else if (coupon.type === 'free_days') {
          text = `${coupon.free_days} ${coupon.free_days === 1 ? 'DAY' : 'DAYS'}`;
        } else {
          text = `${coupon.discount_percentage}%`;
        }
        
        return {
          index: index,
          text: text,
          type: coupon.type,
          value: coupon.type === 'percentage' ? coupon.discount_percentage : coupon.free_days,
          coupon_id: coupon.id,
          code: coupon.code
        };
      });
      
      console.log(`✅ Secure wheel data fetched successfully for wheel ${wheelId}`);
      res.json({ segments: segments });
      
    } catch (error) {
      console.error('❌ Supabase error fetching secure wheel data:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    // Use SQLite
    db.get('SELECT id FROM spinning_wheels WHERE id = ?', [wheelId], (err, wheel) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      // Get wheel coupons
      db.all('SELECT coupon_id FROM wheel_coupons WHERE wheel_id = ?', [wheelId], (err, wheelCoupons) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        const enabledCouponIds = wheelCoupons.map(wc => wc.coupon_id);
        
        if (enabledCouponIds.length === 0) {
          return res.json({ segments: [] });
        }
        
        const placeholders = enabledCouponIds.map(() => '?').join(',');
        db.all(
          `SELECT id, type, discount_percentage, free_days, code 
           FROM coupon_codes 
           WHERE id IN (${placeholders}) AND is_active = 1 
           ORDER BY id ASC`,
          enabledCouponIds,
          (err, coupons) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            const segments = coupons.map((coupon, index) => {
              let text;
              if (coupon.type === 'percentage') {
                text = `${coupon.discount_percentage}%`;
              } else if (coupon.type === 'free_days') {
                text = `${coupon.free_days} ${coupon.free_days === 1 ? 'DAY' : 'DAYS'}`;
              } else {
                text = `${coupon.discount_percentage}%`;
              }
              
              return {
                index: index,
                text: text,
                type: coupon.type,
                value: coupon.type === 'percentage' ? coupon.discount_percentage : coupon.free_days,
                coupon_id: coupon.id,
                code: coupon.code
              };
            });
            
            res.json({ segments: segments });
          }
        );
      });
    });
  }
});

// Secure random winning index endpoint for specific wheel (no sensitive data exposure)
router.get('/:id/secure/random-winning-index', async (req, res) => {
  const wheelId = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log(`🔍 Using Supabase for secure random winning index for wheel ${wheelId}`);
      
      // Check if wheel exists
      const { data: wheel, error: wheelError } = await supabase
        .from('spinning_wheels')
        .select('id')
        .eq('id', wheelId)
        .single();
      
      if (wheelError || !wheel) {
        console.log(`Wheel ${wheelId} not found`);
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      // Get wheel coupons with percentages (minimal data) - same order as secure-data endpoint
      const { data: wheelCoupons, error: couponsError } = await supabase
        .from('wheel_coupons')
        .select('coupon_id, percentage')
        .eq('wheel_id', wheelId)
        .order('coupon_id', { ascending: true });
      
      if (couponsError) {
        console.error('❌ Supabase error fetching wheel coupons:', couponsError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!wheelCoupons || wheelCoupons.length === 0) {
        console.log('No enabled coupons found for wheel');
        return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
      }
      
      // Filter out coupons with 0% probability
      const validCoupons = wheelCoupons.filter(wc => (wc.percentage || 0) > 0);
      
      if (validCoupons.length === 0) {
        console.log('No coupons with valid percentages, using equal distribution for all coupons');
        // If no coupons have valid percentages, use equal distribution for all coupons
        const randomIndex = Math.floor(Math.random() * wheelCoupons.length);
        return res.json({ 
          winningIndex: randomIndex
        });
      }
      
      // Calculate total percentage only for valid coupons
      const totalPercentage = validCoupons.reduce((sum, wc) => sum + (wc.percentage || 0), 0);
      
      // Generate random number between 0 and total percentage
      const randomValue = Math.random() * totalPercentage;
      
      // Find the winning coupon based on cumulative percentages
      let cumulativePercentage = 0;
      let winningIndex = 0;
      
      console.log('🔍 Probability calculation debug:');
      console.log('Random value:', randomValue);
      console.log('Total percentage:', totalPercentage);
      
      for (let i = 0; i < wheelCoupons.length; i++) {
        const coupon = wheelCoupons[i];
        const couponPercentage = coupon.percentage || 0;
        
        console.log(`Index ${i}: coupon_id ${coupon.coupon_id}, percentage ${couponPercentage}`);
        
        // Skip coupons with 0% probability
        if (couponPercentage === 0) {
          console.log(`  Skipping index ${i} (0% probability)`);
          continue;
        }
        
        const rangeStart = cumulativePercentage;
        const rangeEnd = cumulativePercentage + couponPercentage;
        console.log(`  Range: ${rangeStart} - ${rangeEnd}`);
        
        if (randomValue <= rangeEnd) {
          winningIndex = i;
          console.log(`  WINNER: index ${i} (random ${randomValue} <= ${rangeEnd})`);
          break;
        }
        
        cumulativePercentage += couponPercentage;
      }
      
      console.log(`✅ Secure random winning index calculated successfully for wheel ${wheelId}`);
      res.json({ 
        winningIndex: winningIndex
      });
      
    } catch (error) {
      console.error('❌ Supabase error calculating secure random winning index:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    // Use SQLite
    db.get('SELECT id FROM spinning_wheels WHERE id = ?', [wheelId], (err, wheel) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      // Get wheel coupons with percentages
      db.all('SELECT coupon_id, percentage FROM wheel_coupons WHERE wheel_id = ? ORDER BY coupon_id ASC', [wheelId], (err, wheelCoupons) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!wheelCoupons || wheelCoupons.length === 0) {
          return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
        }
        
        // Filter out coupons with 0% probability
        const validCoupons = wheelCoupons.filter(wc => (wc.percentage || 0) > 0);
        
        if (validCoupons.length === 0) {
          // If no coupons have valid percentages, use equal distribution for all coupons
          const randomIndex = Math.floor(Math.random() * wheelCoupons.length);
          return res.json({ 
            winningIndex: randomIndex
          });
        }
        
        // Calculate total percentage only for valid coupons
        const totalPercentage = validCoupons.reduce((sum, wc) => sum + (wc.percentage || 0), 0);
        
        // Generate random number between 0 and total percentage
        const randomValue = Math.random() * totalPercentage;
        
        // Find the winning coupon based on cumulative percentages
        let cumulativePercentage = 0;
        let winningIndex = 0;
        
        for (let i = 0; i < wheelCoupons.length; i++) {
          const coupon = wheelCoupons[i];
          const couponPercentage = coupon.percentage || 0;
          
          // Skip coupons with 0% probability
          if (couponPercentage === 0) {
            continue;
          }
          
          if (randomValue <= cumulativePercentage + couponPercentage) {
            winningIndex = i;
            break;
          }
          
          cumulativePercentage += couponPercentage;
        }
        
        res.json({ 
          winningIndex: winningIndex
        });
      });
    });
  }
});

// Track phone number for spinning wheel
router.post('/track-phone', async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for phone number tracking');
      
      const { trackPhoneNumberForSpinningWheel } = require('../lib/phoneNumberTracker');
      const result = await trackPhoneNumberForSpinningWheel(phoneNumber);
      
      if (result.success) {
        console.log('✅ Phone number tracked successfully for spinning wheel');
        res.json(result);
      } else {
        console.error('❌ Failed to track phone number:', result.error);
        res.status(500).json(result);
      }
      
    } catch (error) {
      console.error('❌ Supabase error tracking phone number:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    // Use SQLite - for now just return success since we don't have phone tracking in SQLite
    console.log('📞 Phone number tracking not implemented for SQLite');
    res.json({ 
      success: true, 
      message: 'Phone number tracking (SQLite not implemented)',
      isNew: false
    });
  }
});

// Secure coupon redemption endpoint
router.post('/secure/redeem-coupon', async (req, res) => {
  const { couponId, phoneNumber } = req.body;
  
  if (!couponId || !phoneNumber) {
    return res.status(400).json({ error: 'Coupon ID and phone number are required' });
  }
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for secure coupon redemption');
      
      // Get the coupon with available codes
      const { data: coupon, error: couponError } = await supabase
        .from('coupon_codes')
        .select('id, code, available_codes, showed_codes')
        .eq('id', couponId)
        .eq('is_active', true)
        .single();
      
      if (couponError || !coupon) {
        console.error('❌ Coupon not found or inactive:', couponId);
        return res.status(404).json({ error: 'Coupon not found or inactive' });
      }
      
      // Parse available codes
      const availableCodes = JSON.parse(coupon.available_codes || '[]');
      const showedCodes = JSON.parse(coupon.showed_codes || '[]');
      
      if (availableCodes.length === 0) {
        console.error('❌ No available codes for coupon:', couponId);
        return res.status(400).json({ error: 'No available codes for this coupon' });
      }
      
      // Get the first available code
      const codeToRedeem = availableCodes[0];
      
      // Remove the code from available and add to showed
      availableCodes.shift();
      showedCodes.push(codeToRedeem);
      
      // Update the coupon
      const { error: updateError } = await supabase
        .from('coupon_codes')
        .update({
          available_codes: JSON.stringify(availableCodes),
          showed_codes: JSON.stringify(showedCodes)
        })
        .eq('id', couponId);
      
      if (updateError) {
        console.error('❌ Error updating coupon codes:', updateError);
        return res.status(500).json({ error: 'Failed to update coupon codes' });
      }
      
      // Add coupon code to user's available coupons
      try {
        const { addAvailableCoupon } = require('../lib/phoneNumberTracker');
        const addResult = await addAvailableCoupon(phoneNumber, codeToRedeem);
        if (addResult.success) {
          console.log(`✅ Added coupon code ${codeToRedeem} to user's available coupons`);
        } else {
          console.error('❌ Failed to add coupon to user\'s available coupons:', addResult.error);
        }
      } catch (addError) {
        console.error('❌ Error adding coupon to user\'s available coupons:', addError);
        // Don't fail the redemption if adding to available coupons fails
      }
      
      console.log('✅ Coupon redeemed successfully:', codeToRedeem);
      res.json({ 
        success: true,
        code: codeToRedeem,
        message: 'Coupon redeemed successfully'
      });
      
    } catch (error) {
      console.error('❌ Supabase error redeeming coupon:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    // Use SQLite
    db.get('SELECT id, code, available_codes, showed_codes FROM coupon_codes WHERE id = ? AND is_active = 1', [couponId], (err, coupon) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found or inactive' });
      }
      
      // Parse available codes
      const availableCodes = JSON.parse(coupon.available_codes || '[]');
      const showedCodes = JSON.parse(coupon.showed_codes || '[]');
      
      if (availableCodes.length === 0) {
        return res.status(400).json({ error: 'No available codes for this coupon' });
      }
      
      // Get the first available code
      const codeToRedeem = availableCodes[0];
      
      // Remove the code from available and add to showed
      availableCodes.shift();
      showedCodes.push(codeToRedeem);
      
      // Update the coupon
      db.run(
        'UPDATE coupon_codes SET available_codes = ?, showed_codes = ? WHERE id = ?',
        [JSON.stringify(availableCodes), JSON.stringify(showedCodes), couponId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update coupon codes' });
          }
          
          // Track phone number for this booking (using existing phone number tracker)
          try {
            const { trackPhoneNumberForBooking } = require('../lib/phoneNumberTracker');
            trackPhoneNumberForBooking(phoneNumber, `coupon_${couponId}_${Date.now()}`);
          } catch (trackingError) {
            console.error('❌ Error tracking phone number:', trackingError);
            // Don't fail the redemption if phone tracking fails
          }
          
          res.json({ 
            success: true,
            code: codeToRedeem,
            message: 'Coupon redeemed successfully'
          });
        }
      );
    });
  }
});

// Simple test route
router.get('/test-simple', (req, res) => {
  res.json({ message: 'Simple test route working' });
});

// Get random winning index based on probabilities
router.get('/random-winning-index', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for random winning index');
      
      // Get the active wheel
      const { data: activeWheel, error: wheelError } = await supabase
        .from('spinning_wheels')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (wheelError) {
        console.error('❌ Supabase error fetching active wheel:', wheelError);
        return res.status(500).json({ error: 'Database error: ' + wheelError.message });
      }
      
      if (!activeWheel) {
        console.log('No active wheel found');
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      // Get all enabled coupons for this wheel with their percentages
      const { data: wheelCoupons, error: couponsError } = await supabase
        .from('wheel_coupons')
        .select(`
          coupon_id,
          percentage,
          coupon_codes!inner(
            id,
            code,
            type,
            discount_percentage,
            free_days
          )
        `)
        .eq('wheel_id', activeWheel.id)
        .eq('coupon_codes.is_active', true)
        .order('coupon_id');
      
      if (couponsError) {
        console.error('❌ Supabase error fetching wheel coupons:', couponsError);
        return res.status(500).json({ error: 'Database error: ' + couponsError.message });
      }
      
      if (!wheelCoupons || wheelCoupons.length === 0) {
        console.log('No enabled coupons found for wheel');
        return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
      }
      
      // Transform the data to match the expected format
      const transformedCoupons = wheelCoupons.map(wc => ({
        coupon_id: wc.coupon_id,
        percentage: wc.percentage,
        code: wc.coupon_codes.code,
        type: wc.coupon_codes.type,
        discount_percentage: wc.coupon_codes.discount_percentage,
        free_days: wc.coupon_codes.free_days
      }));
      
      // Calculate total percentage
      const totalPercentage = transformedCoupons.reduce((sum, coupon) => sum + (coupon.percentage || 0), 0);
      
      if (totalPercentage === 0) {
        console.log('Total percentage is 0, using equal distribution');
        // If all percentages are 0, use equal distribution
        const randomIndex = Math.floor(Math.random() * transformedCoupons.length);
        return res.json({ 
          winningIndex: randomIndex,
          totalPercentage: 0,
          usedEqualDistribution: true,
          allCoupons: transformedCoupons
        });
      }
      
      // Generate random number between 0 and total percentage
      const randomValue = Math.random() * totalPercentage;
      
      // Find the winning coupon based on cumulative percentages
      let cumulativePercentage = 0;
      let winningIndex = 0;
      
      for (let i = 0; i < transformedCoupons.length; i++) {
        const coupon = transformedCoupons[i];
        const couponPercentage = coupon.percentage || 0;
        
        if (randomValue <= cumulativePercentage + couponPercentage) {
          winningIndex = i;
          break;
        }
        
        cumulativePercentage += couponPercentage;
      }
      
      console.log('✅ Random winning index calculated successfully from Supabase');
      res.json({ 
        winningIndex: winningIndex,
        totalPercentage: totalPercentage,
        usedEqualDistribution: false
      });
      
    } catch (error) {
      console.error('❌ Supabase error calculating random winning index:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    db.get('SELECT * FROM spinning_wheels WHERE is_active = 1', (err, wheel) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      db.all(`
        SELECT wc.coupon_id, wc.percentage, cc.code, cc.type, cc.discount_percentage, cc.free_days
        FROM wheel_coupons wc
        JOIN coupon_codes cc ON wc.coupon_id = cc.id
        WHERE wc.wheel_id = ? AND cc.is_active = 1
        ORDER BY wc.coupon_id
      `, [wheel.id], (err, coupons) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!coupons || coupons.length === 0) {
          return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
        }
        
        // Calculate total percentage
        const totalPercentage = coupons.reduce((sum, coupon) => sum + (coupon.percentage || 0), 0);
        
        if (totalPercentage === 0) {
          // If all percentages are 0, use equal distribution
          const randomIndex = Math.floor(Math.random() * coupons.length);
          return res.json({ 
            winningIndex: randomIndex,
            totalPercentage: 0,
            usedEqualDistribution: true
          });
        }
        
        // Generate random number between 0 and total percentage
        const randomValue = Math.random() * totalPercentage;
        
        // Find the winning coupon based on cumulative percentages
        let cumulativePercentage = 0;
        let winningIndex = 0;
        
        for (let i = 0; i < coupons.length; i++) {
          const coupon = coupons[i];
          const couponPercentage = coupon.percentage || 0;
          
          if (randomValue <= cumulativePercentage + couponPercentage) {
            winningIndex = i;
            break;
          }
          
          cumulativePercentage += couponPercentage;
        }
        
        res.json({ 
          winningIndex: winningIndex,
          totalPercentage: totalPercentage,
          usedEqualDistribution: false
        });
      });
    });
  }
});

// Secure random winning index endpoint (no sensitive data exposure)
router.get('/secure/random-winning-index', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for secure random winning index');
      
      // Get the active wheel
      const { data: activeWheel, error: wheelError } = await supabase
        .from('spinning_wheels')
        .select('id')
        .eq('is_active', true)
        .single();
      
      if (wheelError || !activeWheel) {
        console.log('No active wheel found');
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      // Get wheel coupons with percentages (minimal data) - same order as active-data endpoint
      const { data: wheelCoupons, error: couponsError } = await supabase
        .from('wheel_coupons')
        .select('coupon_id, percentage')
        .eq('wheel_id', activeWheel.id)
        .order('coupon_id', { ascending: true });
      
      if (couponsError) {
        console.error('❌ Supabase error fetching wheel coupons:', couponsError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!wheelCoupons || wheelCoupons.length === 0) {
        console.log('No enabled coupons found for wheel');
        return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
      }
      
      // Filter out coupons with 0% probability
      const validCoupons = wheelCoupons.filter(wc => (wc.percentage || 0) > 0);
      
      if (validCoupons.length === 0) {
        console.log('No coupons with valid percentages, using equal distribution for all coupons');
        // If no coupons have valid percentages, use equal distribution for all coupons
        const randomIndex = Math.floor(Math.random() * wheelCoupons.length);
        return res.json({ 
          winningIndex: randomIndex
        });
      }
      
      // Calculate total percentage only for valid coupons
      const totalPercentage = validCoupons.reduce((sum, wc) => sum + (wc.percentage || 0), 0);
      
      // Generate random number between 0 and total percentage
      const randomValue = Math.random() * totalPercentage;
      
      // Find the winning coupon based on cumulative percentages
      let cumulativePercentage = 0;
      let winningIndex = 0;
      
      console.log('🔍 Probability calculation debug:');
      console.log('Random value:', randomValue);
      console.log('Total percentage:', totalPercentage);
      
      for (let i = 0; i < wheelCoupons.length; i++) {
        const coupon = wheelCoupons[i];
        const couponPercentage = coupon.percentage || 0;
        
        console.log(`Index ${i}: coupon_id ${coupon.coupon_id}, percentage ${couponPercentage}`);
        
        // Skip coupons with 0% probability
        if (couponPercentage === 0) {
          console.log(`  Skipping index ${i} (0% probability)`);
          continue;
        }
        
        const rangeStart = cumulativePercentage;
        const rangeEnd = cumulativePercentage + couponPercentage;
        console.log(`  Range: ${rangeStart} - ${rangeEnd}`);
        
        if (randomValue <= rangeEnd) {
          winningIndex = i;
          console.log(`  WINNER: index ${i} (random ${randomValue} <= ${rangeEnd})`);
          break;
        }
        
        cumulativePercentage += couponPercentage;
      }
      
      console.log('✅ Secure random winning index calculated successfully');
      res.json({ 
        winningIndex: winningIndex
      });
      
    } catch (error) {
      console.error('❌ Supabase error calculating secure random winning index:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    // Use SQLite
    db.get('SELECT id FROM spinning_wheels WHERE is_active = 1', (err, wheel) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      db.all('SELECT coupon_id, percentage FROM wheel_coupons WHERE wheel_id = ? ORDER BY coupon_id ASC', [wheel.id], (err, coupons) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!coupons || coupons.length === 0) {
          return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
        }
        
        // Filter out coupons with 0% probability
        const validCoupons = coupons.filter(coupon => (coupon.percentage || 0) > 0);
        
        if (validCoupons.length === 0) {
          console.log('No coupons with valid percentages, using equal distribution for all coupons');
          // If no coupons have valid percentages, use equal distribution for all coupons
          const randomIndex = Math.floor(Math.random() * coupons.length);
          return res.json({ 
            winningIndex: randomIndex
          });
        }
        
        // Calculate total percentage only for valid coupons
        const totalPercentage = validCoupons.reduce((sum, coupon) => sum + (coupon.percentage || 0), 0);
        
        // Generate random number between 0 and total percentage
        const randomValue = Math.random() * totalPercentage;
        
        // Find the winning coupon based on cumulative percentages
        let cumulativePercentage = 0;
        let winningIndex = 0;
        
        console.log('🔍 Probability calculation debug (SQLite):');
        console.log('Random value:', randomValue);
        console.log('Total percentage:', totalPercentage);
        
        for (let i = 0; i < coupons.length; i++) {
          const coupon = coupons[i];
          const couponPercentage = coupon.percentage || 0;
          
          console.log(`Index ${i}: coupon_id ${coupon.coupon_id}, percentage ${couponPercentage}`);
          
          // Skip coupons with 0% probability
          if (couponPercentage === 0) {
            console.log(`  Skipping index ${i} (0% probability)`);
            continue;
          }
          
          const rangeStart = cumulativePercentage;
          const rangeEnd = cumulativePercentage + couponPercentage;
          console.log(`  Range: ${rangeStart} - ${rangeEnd}`);
          
          if (randomValue <= rangeEnd) {
            winningIndex = i;
            console.log(`  WINNER: index ${i} (random ${randomValue} <= ${rangeEnd})`);
            break;
          }
          
          cumulativePercentage += couponPercentage;
        }
        
        res.json({ 
          winningIndex: winningIndex
        });
      });
    });
  }
});

// Temporary endpoint to check phone numbers (for debugging)
router.get('/debug/phone-numbers', async (req, res) => {
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('❌ Error fetching phone numbers:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        success: true,
        count: data.length,
        data: data
      });
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.json({ error: 'Not implemented for SQLite' });
  }
});

// Get single spinning wheel
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for single spinning wheel fetch');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ Supabase error fetching spinning wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      console.log('✅ Spinning wheel fetched successfully from Supabase');
      res.json(data);
      
    } catch (error) {
      console.error('❌ Supabase error fetching spinning wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.get('SELECT * FROM spinning_wheels WHERE id = ?', [id], (err, wheel) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!wheel) {
      return res.status(404).json({ error: 'Spinning wheel not found' });
    }
    res.json(wheel);
  });
  }
});

// Get coupons for a specific wheel
router.get('/:id/coupons', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for wheel coupons fetch');
      
      const { data, error } = await supabase
        .from('wheel_coupons')
        .select('*')
        .eq('wheel_id', id);
      
      if (error) {
        console.error('❌ Supabase error fetching wheel coupons:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('✅ Wheel coupons fetched successfully from Supabase');
      res.json(data || []);
      
    } catch (error) {
      console.error('❌ Supabase error fetching wheel coupons:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.all('SELECT * FROM wheel_coupons WHERE wheel_id = ?', [id], (err, wheelCoupons) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(wheelCoupons);
  });
  }
});

// Add new spinning wheel
router.post('/', async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheel creation');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .insert({
          name,
          description: description || null,
          is_active: false,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error('❌ Supabase error creating spinning wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('✅ Spinning wheel created successfully in Supabase');
      res.json({ success: true, id: data[0].id });
      
    } catch (error) {
      console.error('❌ Supabase error creating spinning wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.run(
    'INSERT INTO spinning_wheels (name, description) VALUES (?, ?)',
    [name, description || null],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
  }
});

// Update spinning wheel
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheel update');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .update({
          name,
          description: description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('❌ Supabase error updating spinning wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      console.log('✅ Spinning wheel updated successfully in Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error updating spinning wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.run(
    'UPDATE spinning_wheels SET name = ?, description = ? WHERE id = ?',
    [name, description || null, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
  }
});

// Activate a spinning wheel
router.patch('/:id/activate', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheel activation');
      
      // First, check if this wheel is already active
      const { data: currentWheel, error: wheelError } = await supabase
        .from('spinning_wheels')
        .select('is_active')
        .eq('id', id)
        .single();
      
      if (wheelError) {
        console.error('❌ Supabase error checking wheel status:', wheelError);
        return res.status(500).json({ error: 'Database error: ' + wheelError.message });
      }
      
      if (!currentWheel) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      // If wheel is already active, just return success
      if (currentWheel.is_active) {
        console.log('✅ Wheel is already active');
        return res.json({ success: true });
      }
      
      // Check count of active wheels before activating
      const { data: activeWheels, error: countError } = await supabase
        .from('spinning_wheels')
        .select('id')
        .eq('is_active', true);
      
      if (countError) {
        console.error('❌ Supabase error counting active wheels:', countError);
        return res.status(500).json({ error: 'Database error: ' + countError.message });
      }
      
      // Check if we already have 2 active wheels
      if (activeWheels && activeWheels.length >= 2) {
        console.log('❌ Maximum active wheels limit reached (2)');
        return res.status(400).json({ 
          error: 'Maximum limit reached. You can only have 2 active wheels at a time. Please disable one wheel before activating another.' 
        });
      }
      
      // Activate the selected wheel
      const { data, error: activateError } = await supabase
        .from('spinning_wheels')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (activateError) {
        console.error('❌ Supabase error activating wheel:', activateError);
        return res.status(500).json({ error: 'Database error: ' + activateError.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      console.log('✅ Spinning wheel activated successfully in Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error activating spinning wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    // First check if wheel is already active
    db.get('SELECT is_active FROM spinning_wheels WHERE id = ?', [id], (err, wheel) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      // If wheel is already active, just return success
      if (wheel.is_active === 1) {
        console.log('✅ Wheel is already active');
        return res.json({ success: true });
      }
      
      // Check count of active wheels
      db.all('SELECT id FROM spinning_wheels WHERE is_active = 1', (err, activeWheels) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Check if we already have 2 active wheels
        if (activeWheels && activeWheels.length >= 2) {
          console.log('❌ Maximum active wheels limit reached (2)');
          return res.status(400).json({ 
            error: 'Maximum limit reached. You can only have 2 active wheels at a time. Please disable one wheel before activating another.' 
          });
        }
        
        // Activate the wheel
        db.run('UPDATE spinning_wheels SET is_active = 1 WHERE id = ?', [id], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          console.log('✅ Spinning wheel activated successfully in SQLite');
          res.json({ success: true });
        });
      });
    });
  }
});

// Deactivate a spinning wheel
router.patch('/:id/deactivate', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheel deactivation');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('❌ Supabase error deactivating spinning wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      console.log('✅ Spinning wheel deactivated successfully in Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error deactivating spinning wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.run('UPDATE spinning_wheels SET is_active = 0 WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
  }
});

// Delete spinning wheel
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheel deletion');
      
      // First delete associated wheel_coupons
      const { error: wheelCouponsError } = await supabase
        .from('wheel_coupons')
        .delete()
        .eq('wheel_id', id);
      
      if (wheelCouponsError) {
        console.error('❌ Supabase error deleting wheel coupons:', wheelCouponsError);
        return res.status(500).json({ error: 'Database error: ' + wheelCouponsError.message });
      }
      
      // Then delete the spinning wheel
      const { data, error } = await supabase
        .from('spinning_wheels')
        .delete()
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('❌ Supabase error deleting spinning wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Spinning wheel not found' });
      }
      
      console.log('✅ Spinning wheel deleted successfully from Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error deleting spinning wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
  db.run('DELETE FROM spinning_wheels WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
  }
});

// Add coupon to wheel
router.post('/:id/coupons', async (req, res) => {
  const wheelId = req.params.id;
  const { coupon_id, percentage = 0 } = req.body;

  if (!coupon_id) {
    return res.status(400).json({ error: 'Coupon ID is required' });
  }

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for adding coupon to wheel');
      
      const { data, error } = await supabase
        .from('wheel_coupons')
        .insert({
          wheel_id: wheelId,
          coupon_id: coupon_id,
          percentage: percentage
        })
        .select();
      
      if (error) {
        console.error('❌ Supabase error adding coupon to wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('✅ Coupon added to wheel successfully in Supabase');
      res.json({ success: true, id: data[0].id });
      
    } catch (error) {
      console.error('❌ Supabase error adding coupon to wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    db.run(
      'INSERT INTO wheel_coupons (wheel_id, coupon_id, percentage) VALUES (?, ?, ?)',
      [wheelId, coupon_id, percentage],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  }
});

// Remove coupon from wheel
router.delete('/:id/coupons/:couponId', async (req, res) => {
  const wheelId = req.params.id;
  const couponId = req.params.couponId;

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for removing coupon from wheel');
      
      const { data, error } = await supabase
        .from('wheel_coupons')
        .delete()
        .eq('wheel_id', wheelId)
        .eq('coupon_id', couponId)
        .select();
      
      if (error) {
        console.error('❌ Supabase error removing coupon from wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('✅ Coupon removed from wheel successfully in Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error removing coupon from wheel:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    db.run(
      'DELETE FROM wheel_coupons WHERE wheel_id = ? AND coupon_id = ?',
      [wheelId, couponId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  }
});

// Update coupon percentage in wheel
router.patch('/:id/coupons/:couponId', async (req, res) => {
  const wheelId = req.params.id;
  const couponId = req.params.couponId;
  const { percentage } = req.body;

  if (percentage === undefined || percentage === null) {
    return res.status(400).json({ error: 'Percentage is required' });
  }

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for updating coupon percentage in wheel');
      
      const { data, error } = await supabase
        .from('wheel_coupons')
        .update({ percentage: percentage })
        .eq('wheel_id', wheelId)
        .eq('coupon_id', couponId)
        .select();
      
      if (error) {
        console.error('❌ Supabase error updating coupon percentage:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Wheel coupon not found' });
      }
      
      console.log('✅ Coupon percentage updated successfully in Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error updating coupon percentage:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    db.run(
      'UPDATE wheel_coupons SET percentage = ? WHERE wheel_id = ? AND coupon_id = ?',
      [percentage, wheelId, couponId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Wheel coupon not found' });
        }
        res.json({ success: true });
      }
    );
  }
});

// Bulk update wheel coupons (for the admin dashboard)
router.post('/:id/coupons/bulk', async (req, res) => {
  const wheelId = req.params.id;
  const { enabled, disabled, percentages } = req.body;

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for bulk wheel coupon update');
      
      // Remove disabled coupons
      if (disabled && disabled.length > 0) {
        const { error: deleteError } = await supabase
          .from('wheel_coupons')
          .delete()
          .eq('wheel_id', wheelId)
          .in('coupon_id', disabled);
        
        if (deleteError) {
          console.error('❌ Supabase error removing disabled coupons:', deleteError);
          return res.status(500).json({ error: 'Database error: ' + deleteError.message });
        }
      }
      
      // Add enabled coupons
      if (enabled && enabled.length > 0) {
        const enabledCoupons = enabled.map(couponId => ({
          wheel_id: wheelId,
          coupon_id: couponId,
          percentage: percentages && percentages[couponId] ? percentages[couponId] : 0
        }));
        
        const { error: insertError } = await supabase
          .from('wheel_coupons')
          .upsert(enabledCoupons, { onConflict: 'wheel_id,coupon_id' });
        
        if (insertError) {
          console.error('❌ Supabase error adding enabled coupons:', insertError);
          return res.status(500).json({ error: 'Database error: ' + insertError.message });
        }
      }
      
      // Update percentages for existing coupons
      if (percentages && Object.keys(percentages).length > 0) {
        for (const [couponId, percentage] of Object.entries(percentages)) {
          const { error: updateError } = await supabase
            .from('wheel_coupons')
            .update({ percentage: percentage })
            .eq('wheel_id', wheelId)
            .eq('coupon_id', couponId);
          
          if (updateError) {
            console.error('❌ Supabase error updating coupon percentage:', updateError);
            return res.status(500).json({ error: 'Database error: ' + updateError.message });
          }
        }
      }
      
      console.log('✅ Bulk wheel coupon update completed successfully in Supabase');
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Supabase error in bulk wheel coupon update:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite with transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let hasError = false;
      
      // Remove disabled coupons
      if (disabled && disabled.length > 0) {
        const placeholders = disabled.map(() => '?').join(',');
        db.run(
          `DELETE FROM wheel_coupons WHERE wheel_id = ? AND coupon_id IN (${placeholders})`,
          [wheelId, ...disabled],
          function (err) {
            if (err) {
              console.error('Error removing disabled coupons:', err);
              hasError = true;
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error' });
            }
          }
        );
      }
      
      // Add enabled coupons
      if (enabled && enabled.length > 0) {
        enabled.forEach(couponId => {
          const percentage = percentages && percentages[couponId] ? percentages[couponId] : 0;
          db.run(
            'INSERT OR REPLACE INTO wheel_coupons (wheel_id, coupon_id, percentage) VALUES (?, ?, ?)',
            [wheelId, couponId, percentage],
            function (err) {
              if (err) {
                console.error('Error adding enabled coupon:', err);
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error' });
              }
            }
          );
        });
      }
      
      // Update percentages for existing coupons
      if (percentages && Object.keys(percentages).length > 0) {
        Object.entries(percentages).forEach(([couponId, percentage]) => {
          db.run(
            'UPDATE wheel_coupons SET percentage = ? WHERE wheel_id = ? AND coupon_id = ?',
            [percentage, wheelId, couponId],
            function (err) {
              if (err) {
                console.error('Error updating coupon percentage:', err);
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error' });
              }
            }
          );
        });
      }
      
      if (!hasError) {
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true });
        });
      }
    });
  }
});

module.exports = router; 