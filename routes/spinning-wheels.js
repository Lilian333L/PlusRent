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

// Simple test route
router.get('/test-simple', (req, res) => {
  res.json({ message: 'Simple test route working' });
});

// Get random winning index based on probabilities
router.get('/random-winning-index', (req, res) => {
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
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

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
});

// Update spinning wheel
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

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

// Deactivate a spinning wheel
router.patch('/:id/deactivate', (req, res) => {
  const id = req.params.id;
  
  db.run('UPDATE spinning_wheels SET is_active = 0 WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
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