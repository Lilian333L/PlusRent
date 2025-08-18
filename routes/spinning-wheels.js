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

// Get active spinning wheel
router.get('/active', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for active spinning wheel fetch');
      
      const { data, error } = await supabase
        .from('spinning_wheels')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error('❌ Supabase error fetching active spinning wheel:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      console.log('✅ Active spinning wheel fetched successfully from Supabase');
      res.json(data);
      
    } catch (error) {
      console.error('❌ Supabase error fetching active spinning wheel:', error);
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
      res.json(wheel);
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
        winningIndex: winningIndex
      });
      
    } catch (error) {
      console.error('❌ Supabase error calculating random winning index:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    // Get the active wheel
    db.get('SELECT * FROM spinning_wheels WHERE is_active = 1', (err, activeWheel) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!activeWheel) {
        console.log('No active wheel found');
        return res.status(404).json({ error: 'No active spinning wheel found' });
      }
      
      // Get all enabled coupons for this wheel with their percentages
      // Order by coupon_id to match the frontend's availableCoupons array order
      const query = `
        SELECT wc.coupon_id, wc.percentage, c.code, c.type, c.discount_percentage, c.free_days
        FROM wheel_coupons wc
        JOIN coupon_codes c ON wc.coupon_id = c.id
        WHERE wc.wheel_id = ? AND c.is_active = 1
        ORDER BY wc.coupon_id
      `;
      
      db.all(query, [activeWheel.id], (err, wheelCoupons) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (wheelCoupons.length === 0) {
          console.log('No enabled coupons found for wheel');
          return res.status(404).json({ error: 'No enabled coupons found for this wheel' });
        }
        
        // Calculate total percentage
        const totalPercentage = wheelCoupons.reduce((sum, coupon) => sum + (coupon.percentage || 0), 0);
        
        if (totalPercentage === 0) {
          console.log('Total percentage is 0, using equal distribution');
          // If all percentages are 0, use equal distribution
          const randomIndex = Math.floor(Math.random() * wheelCoupons.length);
          return res.json({ 
            winningIndex: randomIndex,
            totalPercentage: 0,
            usedEqualDistribution: true,
            allCoupons: wheelCoupons
          });
        }
        
        // Generate random number between 0 and total percentage
        const randomValue = Math.random() * totalPercentage;
        
        // Find the winning coupon based on cumulative percentages
        let cumulativePercentage = 0;
        let winningIndex = 0;
        
        for (let i = 0; i < wheelCoupons.length; i++) {
          const coupon = wheelCoupons[i];
          const couponPercentage = coupon.percentage || 0;
          
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

// Activate a spinning wheel (deactivates all others)
router.patch('/:id/activate', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for spinning wheel activation');
      
      // First, deactivate all wheels
      const { error: deactivateError } = await supabase
        .from('spinning_wheels')
        .update({ is_active: false });
      
      if (deactivateError) {
        console.error('❌ Supabase error deactivating wheels:', deactivateError);
        return res.status(500).json({ error: 'Database error: ' + deactivateError.message });
      }
      
      // Then activate the selected wheel
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
    // First, deactivate all wheels
    db.run('UPDATE spinning_wheels SET is_active = 0', (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Then activate the selected wheel
      db.run('UPDATE spinning_wheels SET is_active = 1 WHERE id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
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