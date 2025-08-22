const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { supabase } = require('../lib/supabaseClient');
const TelegramNotifier = require('../config/telegram');
const { trackPhoneNumberForBooking } = require('../lib/phoneNumberTracker');

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

  console.log('📝 Booking request received:', req.body);

  // Validate required fields
  if (!car_id || !pickup_date || !pickup_time || !return_date || !return_time || 
      !insurance_type || !pickup_location || !dropoff_location) {
    console.log('Missing required fields:', { car_id, pickup_date, pickup_time, return_date, return_time, insurance_type, pickup_location, dropoff_location });
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

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for booking creation');
      
      // Check if car exists
      const { data: car, error: carError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', car_id)
        .single();
      
      if (carError || !car) {
        return res.status(404).json({ error: 'Car not found' });
      }

      // If discount code is provided, validate it and mark as used if it's a redemption code
      let validatedDiscountCode = discount_code;
      if (discount_code) {
        try {
          // First try to validate as redemption code
          const redemptionResponse = await fetch(`${req.protocol}://${req.get('host')}/api/coupons/validate-redemption/${discount_code}`);
          const redemptionResult = await redemptionResponse.json();
          
          if (redemptionResult.valid) {
            // Mark redemption code as used
            const useResponse = await fetch(`${req.protocol}://${req.get('host')}/api/coupons/use-redemption-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                coupon_id: redemptionResult.coupon_id,
                redemption_code: discount_code
              })
            });
            
            if (!useResponse.ok) {
              console.error('Failed to mark redemption code as used');
            } else {
              console.log('✅ Redemption code marked as used');
            }
          }
        } catch (error) {
          console.error('Error validating/marking redemption code:', error);
        }
      }

      // Create booking data
      const bookingData = {
        car_id,
        pickup_date,
        pickup_time,
        return_date,
        return_time,
        discount_code: validatedDiscountCode || null,
        insurance_type,
        pickup_location,
        dropoff_location,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        special_instructions: special_instructions || null,
        total_price,
        price_breakdown: price_breakdown ? JSON.stringify(price_breakdown) : null,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Remove null/undefined values
      Object.keys(bookingData).forEach(key => {
        if (bookingData[key] === null || bookingData[key] === undefined || bookingData[key] === '') {
          delete bookingData[key];
        }
      });

      // Insert booking
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Supabase error creating booking:', insertError);
        return res.status(500).json({ error: 'Failed to create booking', details: insertError.message });
      }

      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const telegramData = {
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
          special_instructions,
          discount_code: validatedDiscountCode
        };
        await telegram.sendMessage(telegram.formatBookingMessage(telegramData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }

      // Track phone number for this booking (only track when booking is created, not when confirmed)
      try {
        const phoneNumber = customer_phone || contact_phone;
        if (phoneNumber) {
          console.log(`📞 Tracking phone number for new booking: ${phoneNumber}`);
          const trackingResult = await trackPhoneNumberForBooking(phoneNumber, newBooking.id.toString());
          if (trackingResult.success) {
            console.log('✅ Phone number tracked successfully:', trackingResult.message);
          } else {
            console.error('❌ Failed to track phone number:', trackingResult.error);
          }
        } else {
          console.log('⚠️  No phone number found for booking, skipping phone tracking');
        }
      } catch (trackingError) {
        console.error('❌ Error tracking phone number:', trackingError);
        // Don't fail the booking creation if phone tracking fails
      }

      console.log('✅ Booking created successfully in Supabase');
      res.json({ 
        success: true, 
        booking_id: newBooking.id,
        message: 'Booking request submitted successfully! We will contact you shortly to confirm your reservation.',
        status: 'pending'
      });

    } catch (error) {
      console.error('❌ Supabase error creating booking:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    db.get('SELECT * FROM cars WHERE id = ?', [car_id], async (err, car) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }

      // If discount code is provided, validate it and mark as used if it's a redemption code
      let validatedDiscountCode = discount_code;
      if (discount_code) {
        try {
          // First try to validate as redemption code
          const redemptionResponse = await fetch(`${req.protocol}://${req.get('host')}/api/coupons/validate-redemption/${discount_code}`);
          const redemptionResult = await redemptionResponse.json();
          
          if (redemptionResult.valid) {
            // Mark redemption code as used
            const useResponse = await fetch(`${req.protocol}://${req.get('host')}/api/coupons/use-redemption-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                coupon_id: redemptionResult.coupon_id,
                redemption_code: discount_code
              })
            });
            
            if (!useResponse.ok) {
              console.error('Failed to mark redemption code as used');
            } else {
              console.log('✅ Redemption code marked as used');
            }
          }
        } catch (error) {
          console.error('Error validating/marking redemption code:', error);
        }
      }

      // Create booking with 'pending' status (car remains available until admin confirms)
      const bookingData = {
        car_id,
        pickup_date,
        pickup_time,
        return_date,
        return_time,
        discount_code: validatedDiscountCode || null,
        insurance_type,
        pickup_location,
        dropoff_location,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        special_instructions: special_instructions || null,
        total_price,
        price_breakdown: price_breakdown ? JSON.stringify(price_breakdown) : null,
        status: 'pending', // Default status - waiting for admin confirmation
        created_at: new Date().toISOString()
      };

      // Remove null/undefined values
      Object.keys(bookingData).forEach(key => {
        if (bookingData[key] === null || bookingData[key] === undefined || bookingData[key] === '') {
          delete bookingData[key];
        }
      });

      db.run(`
        INSERT INTO bookings (
          car_id, pickup_date, pickup_time, return_date, return_time, 
          discount_code, insurance_type, pickup_location, dropoff_location,
          customer_name, customer_phone, special_instructions, total_price, 
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
        bookingData.customer_name,
        bookingData.customer_phone,
        bookingData.special_instructions,
        bookingData.total_price,
        bookingData.price_breakdown,
        bookingData.status,
        bookingData.created_at
      ], async function(err) {
        if (err) {
          console.error('❌ Database error creating booking:', err);
          return res.status(500).json({ error: 'Failed to create booking', details: err.message });
        }

        const bookingId = this.lastID;

        // Send Telegram notification
        try {
          const telegram = new TelegramNotifier();
          const telegramData = {
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
            special_instructions,
            discount_code: validatedDiscountCode
          };
          await telegram.sendMessage(telegram.formatBookingMessage(telegramData));
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
  }
});

// Get all bookings (for admin)
router.get('/', (req, res) => {
  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    // For Supabase, we need to fetch bookings and cars separately and join them
    db.all('SELECT * FROM bookings ORDER BY created_at DESC', async (err, bookings) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Fetch car details for each booking
      const bookingsWithCars = await Promise.all(bookings.map(async (booking) => {
        return new Promise((resolve) => {
          db.get('SELECT make_name, model_name, production_year FROM cars WHERE id = ?', [booking.car_id], (carErr, car) => {
            if (carErr || !car) {
              resolve({
                ...booking,
                make_name: 'Unknown',
                model_name: 'Unknown',
                production_year: null
              });
            } else {
              resolve({
                ...booking,
                make_name: car.make_name,
                model_name: car.model_name,
                production_year: car.production_year
              });
            }
          });
        });
      }));
      
      res.json(bookingsWithCars);
    });
  } else {
    // Use the original JOIN query for SQLite
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
  }
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
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    // For Supabase, fetch booking and car separately
    db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], async (err, booking) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Fetch car details
      db.get('SELECT make_name, model_name, production_year FROM cars WHERE id = ?', [booking.car_id], (carErr, car) => {
        if (carErr || !car) {
          res.json({
            ...booking,
            make_name: 'Unknown',
            model_name: 'Unknown',
            production_year: null
          });
        } else {
          res.json({
            ...booking,
            make_name: car.make_name,
            model_name: car.model_name,
            production_year: car.production_year
          });
        }
      });
    });
  } else {
    // Use the original JOIN query for SQLite
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
  }
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
  
  console.log(`🔔 Booking confirmation requested for ID: ${bookingId}`);
  
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
        ], async function(bookedCarErr) {
          if (bookedCarErr) {
            console.error('Failed to insert into booked_cars:', bookedCarErr);
          }

          // Track phone number for this booking
          try {
            const phoneNumber = booking.contact_phone || booking.customer_phone;
            console.log(`📞 Phone number from booking: ${phoneNumber || 'NOT FOUND'}`);
            
            if (phoneNumber) {
              console.log(`📞 Tracking phone number for confirmed booking: ${phoneNumber}`);
              const trackingResult = await trackPhoneNumberForBooking(phoneNumber, bookingId.toString());
              if (trackingResult.success) {
                console.log('✅ Phone number tracked successfully:', trackingResult.message);
                console.log('📊 Tracking data:', trackingResult.data);
              } else {
                console.error('❌ Failed to track phone number:', trackingResult.error);
              }
            } else {
              console.log('⚠️  No phone number found for booking, skipping phone tracking');
            }
          } catch (trackingError) {
            console.error('❌ Error tracking phone number:', trackingError);
            // Don't fail the booking confirmation if phone tracking fails
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
  
  console.log('🔍 Debug: Rejecting booking ID:', bookingId);
  console.log('🔍 Debug: Reason:', reason);
  
  db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err) {
      console.error('❌ Database error in reject:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!booking) {
      console.log('❌ Booking not found:', bookingId);
      return res.status(404).json({ error: 'Booking not found' });
    }
    console.log('🔍 Debug: Found booking:', booking);
    
    if (booking.status !== 'pending') {
      console.log('❌ Booking not pending, status:', booking.status);
      return res.status(400).json({ error: 'Booking is not pending confirmation' });
    }

    // Update booking status to cancelled
    db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId], function(err) {
      if (err) {
        console.error('❌ Error updating booking status:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('✅ Booking rejected successfully');
      res.json({ 
        success: true, 
        message: 'Booking rejected successfully',
        booking_id: bookingId,
        reason: reason || 'No reason provided'
      });
    });
  });
});

// Sober Driver Callback Request
router.post('/sober-driver-callback', async (req, res) => {
  const { phone_number, customer_name, customer_email, special_instructions } = req.body;

  console.log('📞 Sober Driver callback request received:', req.body);

  // Validate required fields
  if (!phone_number) {
    console.log('Missing required field: phone_number');
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for sober driver callback');
      
      // Create callback request data
      const callbackData = {
        phone_number,
        customer_name: customer_name || null,
        customer_email: customer_email || null,
        special_instructions: special_instructions || null,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Remove null/undefined values
      Object.keys(callbackData).forEach(key => {
        if (callbackData[key] === null || callbackData[key] === undefined || callbackData[key] === '') {
          delete callbackData[key];
        }
      });

      // Insert callback request
      const { data: newCallback, error: insertError } = await supabase
        .from('sober_driver_callbacks')
        .insert(callbackData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Supabase error creating sober driver callback:', insertError);
        return res.status(500).json({ error: 'Failed to create callback request', details: insertError.message });
      }

      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const telegramData = {
          phone_number,
          customer_name: customer_name || 'Not provided',
          customer_email: customer_email || 'Not provided',
          special_instructions: special_instructions || 'None provided'
        };
        await telegram.sendMessage(telegram.formatSoberDriverCallbackMessage(telegramData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }

      console.log('✅ Sober driver callback created successfully in Supabase');
      res.json({ 
        success: true, 
        callback_id: newCallback.id,
        message: 'Callback request submitted successfully! We will call you back within minutes.',
        status: 'pending'
      });

    } catch (error) {
      console.error('❌ Supabase error creating sober driver callback:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  } else {
    // Use SQLite
    const callbackData = {
      phone_number,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      special_instructions: special_instructions || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Remove null/undefined values
    Object.keys(callbackData).forEach(key => {
      if (callbackData[key] === null || callbackData[key] === undefined || callbackData[key] === '') {
        delete callbackData[key];
      }
    });

    db.run(`
      INSERT INTO sober_driver_callbacks (
        phone_number, customer_name, customer_email, special_instructions, 
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      callbackData.phone_number,
      callbackData.customer_name,
      callbackData.customer_email,
      callbackData.special_instructions,
      callbackData.status,
      callbackData.created_at
    ], async function(err) {
      if (err) {
        console.error('❌ Database error creating sober driver callback:', err);
        return res.status(500).json({ error: 'Failed to create callback request', details: err.message });
      }

      const callbackId = this.lastID;

      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const telegramData = {
          phone_number,
          customer_name: customer_name || 'Not provided',
          customer_email: customer_email || 'Not provided',
          special_instructions: special_instructions || 'None provided'
        };
        await telegram.sendMessage(telegram.formatSoberDriverCallbackMessage(telegramData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }

      res.json({ 
        success: true, 
        callback_id: callbackId,
        message: 'Callback request submitted successfully! We will call you back within minutes.',
        status: 'pending'
      });
    });
  }
});

module.exports = router; 