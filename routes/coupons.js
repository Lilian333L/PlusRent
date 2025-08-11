const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
// const TelegramNotifier = require('../config/telegram');

// Debug middleware for all coupon routes
router.use((req, res, next) => {
  console.log('🔍 COUPON ROUTE ACCESSED:', req.method, req.originalUrl);
  next();
});

// Get all coupon codes
router.get('/', (req, res) => {
  db.all('SELECT * FROM coupon_codes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Debug endpoint to check table structure
router.get('/debug-table', (req, res) => {
  db.all("PRAGMA table_info(coupon_codes)", (err, rows) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Table structure:', rows);
    res.json({ tableStructure: rows });
  });
});



// Toggle wheel enabled status for a coupon
router.patch('/:id/toggle-wheel', (req, res) => {
  const id = req.params.id;
  const wheelId = req.query.wheelId; // Get wheel ID from query parameter
  
  console.log('Toggle wheel request for coupon ID:', id, 'Wheel ID:', wheelId);
  
  if (!wheelId) {
    return res.status(400).json({ error: 'Wheel ID is required' });
  }
  
  // Check if coupon exists
  db.get('SELECT id FROM coupon_codes WHERE id = ?', [id], (err, coupon) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!coupon) {
      console.log('Coupon not found for ID:', id);
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    // Check if wheel exists
    db.get('SELECT id FROM spinning_wheels WHERE id = ?', [wheelId], (err, wheel) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        console.log('Wheel not found for ID:', wheelId);
        return res.status(404).json({ error: 'Wheel not found' });
      }
      
      // Check if coupon is already enabled for this wheel
      db.get('SELECT id FROM wheel_coupons WHERE wheel_id = ? AND coupon_id = ?', [wheelId, id], (err, existing) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (existing) {
          // Remove from wheel
          console.log(`Attempting to delete coupon ${id} from wheel ${wheelId}`);
          db.run('DELETE FROM wheel_coupons WHERE wheel_id = ? AND coupon_id = ?', [wheelId, id], function(err) {
            if (err) {
              console.error('Delete error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            console.log(`Successfully removed coupon ${id} from wheel ${wheelId}. Rows affected: ${this.changes}`);
            
            // Verify the deletion by checking if the record still exists
            db.get('SELECT id FROM wheel_coupons WHERE wheel_id = ? AND coupon_id = ?', [wheelId, id], (verifyErr, verifyResult) => {
              if (verifyErr) {
                console.error('Verification error:', verifyErr);
              } else if (verifyResult) {
                console.error(`❌ VERIFICATION FAILED: Coupon ${id} still exists in wheel ${wheelId} after deletion!`);
              } else {
                console.log(`✅ VERIFICATION SUCCESS: Coupon ${id} successfully removed from wheel ${wheelId}`);
              }
              res.json({ success: true, wheel_enabled: false });
            });
          });
        } else {
          // Add to wheel
          console.log(`Attempting to add coupon ${id} to wheel ${wheelId}`);
          db.run('INSERT INTO wheel_coupons (wheel_id, coupon_id) VALUES (?, ?)', [wheelId, id], function(err) {
            if (err) {
              console.error('Insert error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            console.log(`Successfully added coupon ${id} to wheel ${wheelId}. Last ID: ${this.lastID}`);
            res.json({ success: true, wheel_enabled: true });
          });
        }
      });
    });
  });
});

// Update coupon percentage for a specific wheel
router.patch('/:id/wheel-percentage', (req, res) => {
  const couponId = req.params.id;
  const { wheelId, percentage } = req.body;
  

  
  if (!wheelId || percentage === undefined) {
    return res.status(400).json({ error: 'Wheel ID and percentage are required' });
  }
  
  // Validate percentage
  const numPercentage = parseFloat(percentage);
  if (isNaN(numPercentage) || numPercentage < 0 || numPercentage > 100) {
    return res.status(400).json({ error: 'Percentage must be between 0 and 100' });
  }
  
  // Check if coupon exists
  db.get('SELECT id FROM coupon_codes WHERE id = ?', [couponId], (err, coupon) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!coupon) {
      console.log('Coupon not found for ID:', couponId);
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    // Check if wheel exists
    db.get('SELECT id FROM spinning_wheels WHERE id = ?', [wheelId], (err, wheel) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!wheel) {
        console.log('Wheel not found for ID:', wheelId);
        return res.status(404).json({ error: 'Wheel not found' });
      }
      
      // Check if coupon is enabled for this wheel
      db.get('SELECT id FROM wheel_coupons WHERE wheel_id = ? AND coupon_id = ?', [wheelId, couponId], (err, existing) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!existing) {
          return res.status(400).json({ error: 'Coupon is not enabled for this wheel' });
        }
        
        // Update the percentage
        db.run('UPDATE wheel_coupons SET percentage = ? WHERE wheel_id = ? AND coupon_id = ?', 
               [numPercentage, wheelId, couponId], (err) => {
          if (err) {
            console.error('Update error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({ success: true, percentage: numPercentage });
        });
      });
    });
  });
});

// Get single coupon code
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM coupon_codes WHERE id = ?', [id], (err, coupon) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json(coupon);
  });
});

// Add new coupon code
router.post('/', (req, res) => {
  console.log('📥 Received coupon data:', req.body);
  console.log('📥 Request headers:', req.headers);
  console.log('📥 Content-Type:', req.headers['content-type']);
  
  try {
    const { code, type, discount_percentage, free_days, description, expires_at } = req.body;

    console.log('🔍 Validating code and type...');
    if (!code || !type) {
      console.log('❌ Missing code or type. Code:', code, 'Type:', type);
      return res.status(400).json({ error: 'Code and type are required' });
    }

    console.log('🔍 Validating type value...');
    if (type !== 'percentage' && type !== 'free_days') {
      console.log('❌ Invalid type:', type);
      return res.status(400).json({ error: 'Type must be either "percentage" or "free_days"' });
    }

  let discountValue = null;
  let freeDaysValue = null;

  if (type === 'percentage') {
    console.log('🔍 Validating percentage type...');
    console.log('🔍 Discount percentage value:', discount_percentage);
    if (!discount_percentage) {
      console.log('❌ Missing discount percentage for percentage type');
      return res.status(400).json({ error: 'Discount percentage is required for percentage type' });
    }
    discountValue = parseFloat(discount_percentage);
    console.log('🔍 Parsed discount value:', discountValue);
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      console.log('❌ Invalid discount percentage:', discountValue);
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }
  } else if (type === 'free_days') {
    console.log('🔍 Validating free_days type...');
    console.log('🔍 Free days value:', free_days);
    if (!free_days) {
      console.log('❌ Missing free days for free_days type');
      return res.status(400).json({ error: 'Free days is required for free_days type' });
    }
    freeDaysValue = parseInt(free_days);
    console.log('🔍 Parsed free days value:', freeDaysValue);
    if (isNaN(freeDaysValue) || freeDaysValue <= 0) {
      console.log('❌ Invalid free days:', freeDaysValue);
      return res.status(400).json({ error: 'Free days must be a positive number' });
    }
  }

  db.run(
    'INSERT INTO coupon_codes (code, type, discount_percentage, free_days, description, expires_at, wheel_enabled) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [code.toUpperCase(), type, discountValue, freeDaysValue, description || null, expires_at || null],
    async function (err) {
      if (err) {
        console.error('Database error details:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      // Send Telegram notification
<<<<<<< Updated upstream
      try {
        const telegram = new TelegramNotifier();
        const couponData = {
          code: code.toUpperCase(),
          type: type,
          discount_percentage: discountValue,
          free_days: freeDaysValue,
          description: description || null,
          expires_at: expires_at || null,
          is_active: true
        };
        await telegram.sendMessage(telegram.formatCouponAddedMessage(couponData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
=======
      // try {
      //   const telegram = new TelegramNotifier();
      //   const couponData = {
      //     code: code.toUpperCase(),
      //     discount_percentage: discountValue,
      //     description: description || null,
      //     expires_at: expires_at || null,
      //     is_active: true
      //   };
      //   await telegram.sendMessage(telegram.formatCouponAddedMessage(couponData));
      // } catch (error) {
      //   console.error('Error sending Telegram notification:', error);
      // }
>>>>>>> Stashed changes
      
      res.json({ success: true, id: this.lastID });
    }
  );
  } catch (error) {
    console.error('Unexpected error in POST /coupons:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Catch-all route to see what requests are coming in
router.use('*', (req, res, next) => {
  console.log('🔍 ALL REQUEST:', req.method, req.originalUrl);
  console.log('🔍 Request body:', req.body);
  next();
});

// Update coupon code
router.put('/:id', (req, res) => {
  console.log('🚨 PUT REQUEST RECEIVED!');
  console.log('📥 Edit coupon request - ID:', req.params.id);
  console.log('📥 Edit coupon request - Body:', req.body);
  const id = req.params.id;
  const { code, type, discount_percentage, free_days, description, is_active, expires_at } = req.body;

  if (!code || !type) {
    return res.status(400).json({ error: 'Code and type are required' });
  }

  if (type !== 'percentage' && type !== 'free_days') {
    return res.status(400).json({ error: 'Type must be either "percentage" or "free_days"' });
  }

  let discountValue = null;
  let freeDaysValue = null;

  if (type === 'percentage') {
    if (!discount_percentage) {
      return res.status(400).json({ error: 'Discount percentage is required for percentage type' });
    }
    discountValue = parseFloat(discount_percentage);
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }
  } else if (type === 'free_days') {
    if (!free_days) {
      return res.status(400).json({ error: 'Free days is required for free_days type' });
    }
    freeDaysValue = parseInt(free_days);
    if (isNaN(freeDaysValue) || freeDaysValue <= 0) {
      return res.status(400).json({ error: 'Free days must be a positive number' });
    }
  }

  console.log('🔍 Edit coupon - Executing UPDATE query');
  const isActiveValue = is_active === '1' || is_active === true ? 1 : 0;
  console.log('🔍 Edit coupon - Values:', [code.toUpperCase(), type, discountValue, freeDaysValue, description || null, isActiveValue, expires_at || null, id]);
  db.run(
    'UPDATE coupon_codes SET code=?, type=?, discount_percentage=?, free_days=?, description=?, is_active=?, expires_at=? WHERE id=?',
    [code.toUpperCase(), type, discountValue, freeDaysValue, description || null, isActiveValue, expires_at || null, id],
    async function (err) {
      if (err) {
        console.log('❌ Edit coupon - Database error:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      
<<<<<<< Updated upstream
      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const couponData = {
          code: code.toUpperCase(),
          type: type,
          discount_percentage: discountValue,
          free_days: freeDaysValue,
          description: description || null,
          expires_at: expires_at || null,
          is_active: isActiveValue
        };
        await telegram.sendMessage(telegram.formatCouponUpdatedMessage(couponData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
=======
      // Send Telegram notification - COMMENTED OUT
      // try {
      //   const telegram = new TelegramNotifier();
      //   const couponData = {
      //     code: code.toUpperCase(),
      //     discount_percentage: discountValue,
      //     description: description || null,
      //     expires_at: expires_at || null,
      //     is_active: is_active ? 1 : 0
      //   };
      //   await telegram.sendMessage(telegram.formatCouponUpdatedMessage(couponData));
      // } catch (error) {
      //   console.error('Error sending Telegram notification:', error);
      // }
>>>>>>> Stashed changes
      
      console.log('✅ Edit coupon - Update successful');
      res.json({ success: true });
    }
  );
});

// Delete coupon code
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM coupon_codes WHERE id = ?', [id], async function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Send Telegram notification - COMMENTED OUT
    // try {
    //   const telegram = new TelegramNotifier();
    //   const couponData = {
    //     code: 'DELETED',
    //     discount_percentage: 0
    //   };
    //   await telegram.sendMessage(telegram.formatCouponDeletedMessage(couponData));
    // } catch (error) {
    //   console.error('Error sending Telegram notification:', error);
    // }
    
    res.json({ success: true });
  });
});

// Validate coupon code (for price calculator)
router.get('/validate/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  
  db.get('SELECT * FROM coupon_codes WHERE code = ? AND is_active = 1', [code], (err, coupon) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!coupon) {
      return res.json({ valid: false, message: 'Invalid coupon code' });
    }
    
    // Check if coupon has expired
    if (coupon.expires_at) {
      const now = new Date();
      const expiryDate = new Date(coupon.expires_at);
      if (now > expiryDate) {
        return res.json({ valid: false, message: 'Coupon has expired' });
      }
    }
    
    res.json({ 
      valid: true, 
      discount_percentage: coupon.discount_percentage,
      description: coupon.description 
    });
  });
});

module.exports = router; 