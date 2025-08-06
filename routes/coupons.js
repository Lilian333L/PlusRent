const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const TelegramNotifier = require('../config/telegram');

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

// Get random winning index for spinning wheel
router.get('/random-winning-index', (req, res) => {
  db.all('SELECT COUNT(*) as count FROM coupon_codes WHERE is_active = 1', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const activeCouponsCount = rows[0].count;
    if (activeCouponsCount === 0) {
      return res.status(400).json({ error: 'No active coupons available' });
    }
    
    // Generate random index between 0 and activeCouponsCount - 1
    const winningIndex = Math.floor(Math.random() * activeCouponsCount);
    
    res.json({ winningIndex });
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
  console.log('Received coupon data:', req.body);
  
  try {
    const { code, type, discount_percentage, free_days, description, expires_at } = req.body;

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

  db.run(
    'INSERT INTO coupon_codes (code, type, discount_percentage, free_days, description, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
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
      
      res.json({ success: true, id: this.lastID });
    }
  );
  } catch (error) {
    console.error('Unexpected error in POST /coupons:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Update coupon code
router.put('/:id', (req, res) => {
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

  db.run(
    'UPDATE coupon_codes SET code=?, type=?, discount_percentage=?, free_days=?, description=?, is_active=?, expires_at=? WHERE id=?',
    [code.toUpperCase(), type, discountValue, freeDaysValue, description || null, is_active ? 1 : 0, expires_at || null, id],
    async function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      
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
          is_active: is_active ? 1 : 0
        };
        await telegram.sendMessage(telegram.formatCouponUpdatedMessage(couponData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
      
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
    
    // Send Telegram notification
    try {
      const telegram = new TelegramNotifier();
      const couponData = {
        code: 'DELETED',
        discount_percentage: 0
      };
      await telegram.sendMessage(telegram.formatCouponDeletedMessage(couponData));
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
    
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