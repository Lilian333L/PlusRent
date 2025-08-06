const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// Get all spinning wheels
router.get('/', (req, res) => {
  db.all('SELECT * FROM spinning_wheels ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get active spinning wheel
router.get('/active', (req, res) => {
  db.get('SELECT * FROM spinning_wheels WHERE is_active = 1', (err, wheel) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!wheel) {
      return res.status(404).json({ error: 'No active spinning wheel found' });
    }
    res.json(wheel);
  });
});

// Get single spinning wheel
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM spinning_wheels WHERE id = ?', [id], (err, wheel) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!wheel) {
      return res.status(404).json({ error: 'Spinning wheel not found' });
    }
    res.json(wheel);
  });
});

// Get coupons for a specific wheel
router.get('/:id/coupons', (req, res) => {
  const id = req.params.id;
  db.all('SELECT * FROM wheel_coupons WHERE wheel_id = ?', [id], (err, wheelCoupons) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(wheelCoupons);
  });
});

// Add new spinning wheel
router.post('/', (req, res) => {
  const { name, description, coupon_type } = req.body;

  if (!name || !coupon_type) {
    return res.status(400).json({ error: 'Name and coupon type are required' });
  }

  if (coupon_type !== 'percentage' && coupon_type !== 'free_days') {
    return res.status(400).json({ error: 'Coupon type must be either "percentage" or "free_days"' });
  }

  db.run(
    'INSERT INTO spinning_wheels (name, description, coupon_type) VALUES (?, ?, ?)',
    [name, description || null, coupon_type],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Update spinning wheel
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { name, description, coupon_type } = req.body;

  if (!name || !coupon_type) {
    return res.status(400).json({ error: 'Name and coupon type are required' });
  }

  if (coupon_type !== 'percentage' && coupon_type !== 'free_days') {
    return res.status(400).json({ error: 'Coupon type must be either "percentage" or "free_days"' });
  }

  db.run(
    'UPDATE spinning_wheels SET name = ?, description = ?, coupon_type = ? WHERE id = ?',
    [name, description || null, coupon_type, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// Activate a spinning wheel (deactivates all others)
router.patch('/:id/activate', (req, res) => {
  const id = req.params.id;
  
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
});

// Delete spinning wheel
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM spinning_wheels WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

module.exports = router; 