const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const TelegramNotifier = require('../config/telegram');

// Create a new booking
router.post('/', async (req, res) => {
  const {
    car_id,
    pickup_date,
    pickup_time,
    return_date,
    return_time,
    discount_code,
    insurance_type,
    pickup_location,
    dropoff_location,
    contact_person,
    contact_phone,
    special_instructions,
    total_price,
    price_breakdown,
    customer_name,
    customer_email,
    customer_phone
  } = req.body;

  // Validate required fields
  if (!car_id || !pickup_date || !pickup_time || !return_date || !return_time || 
      !insurance_type || !pickup_location || !dropoff_location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Customer fields validation - commented out for now
  /*
  if (!customer_name || !customer_email || !customer_phone) {
    return res.status(400).json({ error: 'Missing customer information' });
  }
  */

  // Validate dates
  const pickupDateTime = new Date(`${pickup_date}T${pickup_time}`);
  const returnDateTime = new Date(`${return_date}T${return_time}`);
  const now = new Date();
  
  // Allow today's date for pickup (set time to start of day for comparison)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pickupDateOnly = new Date(pickup_date);
  pickupDateOnly.setHours(0, 0, 0, 0);

  if (pickupDateOnly < today) {
    return res.status(400).json({ error: 'Pickup date must be today or in the future' });
  }

  if (returnDateTime <= pickupDateTime) {
    return res.status(400).json({ error: 'Return date must be after pickup date' });
  }

  // Check if car exists
  db.get('SELECT * FROM cars WHERE id = ?', [car_id], (err, car) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Create booking with 'pending' status (car remains available until admin confirms)
    const bookingData = {
      car_id,
      pickup_date,
      pickup_time,
      return_date,
      return_time,
      discount_code: discount_code || null,
      insurance_type,
      pickup_location,
      dropoff_location,
      contact_person: contact_person || null,
      contact_phone: contact_phone || null,
      special_instructions: special_instructions || null,
      total_price,
      price_breakdown: price_breakdown ? JSON.stringify(price_breakdown) : null,
      status: 'pending', // Default status - waiting for admin confirmation
      created_at: new Date().toISOString()
    };

    db.run(`
      INSERT INTO bookings (
        car_id, pickup_date, pickup_time, return_date, return_time, 
        discount_code, insurance_type, pickup_location, dropoff_location,
        contact_person, contact_phone, special_instructions, total_price, 
        price_breakdown, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bookingData.car_id,
      bookingData.pickup_date,
      bookingData.pickup_time,
      bookingData.return_date,
      bookingData.return_time,
      bookingData.discount_code,
      bookingData.insurance_type,
      bookingData.pickup_location,
      bookingData.dropoff_location,
      bookingData.contact_person,
      bookingData.contact_phone,
      bookingData.special_instructions,
      bookingData.total_price,
      bookingData.price_breakdown,
      bookingData.status,
      bookingData.created_at
    ], async function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create booking' });
      }

      const bookingId = this.lastID;

      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const bookingData = {
          contact_person: customer_name || contact_person || 'Not provided',
          contact_phone: customer_phone || contact_phone || 'Not provided',
          email: customer_email || 'Not provided',
          make_name: car.make_name,
          model_name: car.model_name,
          production_year: car.production_year,
          pickup_date,
          pickup_time,
          return_date,
          return_time,
          pickup_location,
          dropoff_location,
          insurance_type,
          total_price,
          special_instructions
        };
        await telegram.sendMessage(telegram.formatBookingMessage(bookingData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }

      res.json({ 
        success: true, 
        booking_id: bookingId,
        message: 'Booking request submitted successfully! We will contact you shortly to confirm your reservation.',
        status: 'pending'
      });
    });
  });
});

// Get all bookings (for admin)
router.get('/', (req, res) => {
  db.all(`
    SELECT b.*, c.make_name, c.model_name, c.production_year 
    FROM bookings b 
    JOIN cars c ON b.car_id = c.id 
    ORDER BY b.created_at DESC
  `, (err, bookings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(bookings);
  });
});

// Get all booked cars with customer info (for admin)
router.get('/booked-cars', (req, res) => {
  db.all(`
    SELECT bc.*, c.make_name, c.model_name, c.production_year, c.car_type
    FROM booked_cars bc 
    JOIN cars c ON bc.car_id = c.id 
    WHERE bc.status = 'active'
    ORDER BY bc.created_at DESC
  `, (err, bookedCars) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(bookedCars);
  });
});

// Get booking by ID
router.get('/:id', (req, res) => {
  const bookingId = req.params.id;
  db.get(`
    SELECT b.*, c.make_name, c.model_name, c.production_year 
    FROM bookings b 
    JOIN cars c ON b.car_id = c.id 
    WHERE b.id = ?
  `, [bookingId], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  });
});

// Update booking status
router.put('/:id/status', (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;

  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // If booking is confirmed, update car availability
    if (status === 'confirmed') {
      db.get('SELECT car_id, return_date FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
        if (!err && booking) {
          db.run('UPDATE cars SET booked = 1, booked_until = ? WHERE id = ?', 
            [booking.return_date, booking.car_id], (updateErr) => {
            if (updateErr) {
              console.error('Failed to update car booking status:', updateErr);
            }
          });
        }
      });
    }

    // If booking is cancelled, ensure car is available
    if (status === 'cancelled') {
      db.get('SELECT car_id FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
        if (!err && booking) {
          db.run('UPDATE cars SET booked = 0, booked_until = NULL WHERE id = ?', 
            [booking.car_id], (updateErr) => {
            if (updateErr) {
              console.error('Failed to update car availability:', updateErr);
            }
          });
        }
      });
    }

    res.json({ 
      success: true, 
      message: `Booking ${status} successfully`,
      status: status 
    });
  });
});

// Admin: Confirm booking and mark car as unavailable
router.put('/:id/confirm', (req, res) => {
  const bookingId = req.params.id;
  
  db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Booking is not pending confirmation' });
    }

    // Update booking status to confirmed
    db.run('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', bookingId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Mark car as booked
      db.run('UPDATE cars SET booked = 1, booked_until = ? WHERE id = ?', 
        [booking.return_date, booking.car_id], (updateErr) => {
        if (updateErr) {
          console.error('Failed to update car booking status:', updateErr);
          return res.status(500).json({ error: 'Failed to update car status' });
        }

        // Insert into booked_cars table
        db.run(`
          INSERT INTO booked_cars (
            car_id, booking_id, customer_name, customer_email, customer_phone,
            pickup_date, pickup_time, return_date, return_time, insurance_type,
            pickup_location, dropoff_location, total_price, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `, [
          booking.car_id,
          bookingId,
          booking.contact_person || 'Not provided',
          'Not provided', // customer_email
          booking.contact_phone || 'Not provided',
          booking.pickup_date,
          booking.pickup_time,
          booking.return_date,
          booking.return_time,
          booking.insurance_type,
          booking.pickup_location,
          booking.dropoff_location,
          booking.total_price,
          new Date().toISOString(),
          new Date().toISOString()
        ], function(bookedCarErr) {
          if (bookedCarErr) {
            console.error('Failed to insert into booked_cars:', bookedCarErr);
          }

          res.json({ 
            success: true, 
            message: 'Booking confirmed and car marked as unavailable',
            booking_id: bookingId,
            car_id: booking.car_id
          });
        });
      });
    });
  });
});

// Admin: Reject booking (car remains available)
router.put('/:id/reject', (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Booking is not pending confirmation' });
    }

    // Update booking status to cancelled
    db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ 
        success: true, 
        message: 'Booking rejected successfully',
        booking_id: bookingId,
        reason: reason || 'No reason provided'
      });
    });
  });
});

module.exports = router; 