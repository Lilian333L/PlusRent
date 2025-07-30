const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// Get all coupon codes
router.get('/', (req, res) => {
  db.all('SELECT * FROM coupon_codes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
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
  const { code, discount_percentage, description, expires_at } = req.body;

  if (!code || !discount_percentage) {
    return res.status(400).json({ error: 'Code and discount percentage are required' });
  }

  const discountValue = parseFloat(discount_percentage);
  if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
    return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
  }

  db.run(
    'INSERT INTO coupon_codes (code, discount_percentage, description, expires_at) VALUES (?, ?, ?, ?)',
    [code.toUpperCase(), discountValue, description || null, expires_at || null],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Update coupon code
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { code, discount_percentage, description, is_active, expires_at } = req.body;

  if (!code || !discount_percentage) {
    return res.status(400).json({ error: 'Code and discount percentage are required' });
  }

  const discountValue = parseFloat(discount_percentage);
  if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
    return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
  }

  db.run(
    'UPDATE coupon_codes SET code=?, discount_percentage=?, description=?, is_active=?, expires_at=? WHERE id=?',
    [code.toUpperCase(), discountValue, description || null, is_active ? 1 : 0, expires_at || null, id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// Delete coupon code
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM coupon_codes WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
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