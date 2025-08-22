const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabaseClient');
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

  console.log('📝 Booking request received:', req.body);

  // Validate required fields
  if (!car_id || !pickup_date || !pickup_time || !return_date || !return_time || 
      !insurance_type || !pickup_location || !dropoff_location) {
    console.log('Missing required fields:', { car_id, pickup_date, pickup_time, return_date, return_time, insurance_type, pickup_location, dropoff_location });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate dates
  const pickupDateTime = new Date(`${pickup_date}T${pickup_time}`);
  const returnDateTime = new Date(`${return_date}T${return_time}`);
  
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
});

// Get all bookings (admin)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching all bookings from Supabase');
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars (
          make_name,
          model_name,
          production_year
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error fetching bookings:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
    }

    console.log('✅ Bookings fetched successfully:', bookings.length);
    res.json(bookings);

  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Get all booked cars with customer info (admin)
router.get('/booked-cars', async (req, res) => {
  try {
    console.log('🔍 Fetching booked cars from Supabase');
    
    const { data: bookedCars, error } = await supabase
      .from('booked_cars')
      .select(`
        *,
        cars (
          make_name,
          model_name,
          production_year,
          car_type
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error fetching booked cars:', error);
      return res.status(500).json({ error: 'Failed to fetch booked cars', details: error.message });
    }

    console.log('✅ Booked cars fetched successfully:', bookedCars.length);
    res.json(bookedCars);

  } catch (error) {
    console.error('❌ Error fetching booked cars:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  const bookingId = req.params.id;
  
  try {
    console.log('🔍 Fetching booking from Supabase:', bookingId);
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars (
          make_name,
          model_name,
          production_year
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('❌ Supabase error fetching booking:', error);
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('✅ Booking fetched successfully');
    res.json(booking);

  } catch (error) {
    console.error('❌ Error fetching booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Update booking status
router.put('/:id/status', async (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;

  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    console.log('🔄 Updating booking status:', bookingId, 'to:', status);
    
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Error updating booking status:', updateError);
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    // If booking is confirmed, update car availability
    if (status === 'confirmed') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('car_id, return_date')
        .eq('id', bookingId)
        .single();

      if (booking) {
        const { error: carUpdateError } = await supabaseAdmin
          .from('cars')
          .update({ 
            booked: true, 
            booked_until: booking.return_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.car_id);

        if (carUpdateError) {
          console.error('Failed to update car booking status:', carUpdateError);
        }
      }
    }

    // If booking is cancelled, ensure car is available
    if (status === 'cancelled') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('car_id')
        .eq('id', bookingId)
        .single();

      if (booking) {
        const { error: carUpdateError } = await supabaseAdmin
          .from('cars')
          .update({ 
            booked: false, 
            booked_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.car_id);

        if (carUpdateError) {
          console.error('Failed to update car availability:', carUpdateError);
        }
      }
    }

    console.log('✅ Booking status updated successfully');
    res.json({ 
      success: true, 
      message: `Booking ${status} successfully`,
      status: status 
    });

  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Confirm booking and mark car as unavailable
router.put('/:id/confirm', async (req, res) => {
  const bookingId = req.params.id;
  
  console.log('✅ Admin confirming booking:', bookingId);
  
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      console.error('❌ Booking is not pending, status:', booking.status);
      return res.status(400).json({ error: 'Booking is not pending confirmation' });
    }

    console.log('📋 Found booking:', booking);

    // Update booking status to confirmed
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Error updating booking status:', updateError);
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    // Mark car as booked
    const { error: carUpdateError } = await supabaseAdmin
      .from('cars')
      .update({ 
        booked: true, 
        booked_until: booking.return_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.car_id);

    if (carUpdateError) {
      console.error('❌ Error updating car status:', carUpdateError);
      return res.status(500).json({ error: 'Failed to update car status' });
    }

    // Insert into booked_cars table for active rentals tracking
    const bookedCarData = {
      car_id: booking.car_id,
      booking_id: bookingId,
      customer_name: booking.customer_name || 'Not provided',
      customer_email: booking.customer_email || 'Not provided',
      customer_phone: booking.customer_phone || 'Not provided',
      pickup_date: booking.pickup_date,
      pickup_time: booking.pickup_time,
      return_date: booking.return_date,
      return_time: booking.return_time,
      insurance_type: booking.insurance_type,
      pickup_location: booking.pickup_location,
      dropoff_location: booking.dropoff_location,
      total_price: booking.total_price,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: bookedCarError } = await supabaseAdmin
      .from('booked_cars')
      .insert(bookedCarData);

    if (bookedCarError) {
      console.error('❌ Error inserting into booked_cars:', bookedCarError);
      // Don't fail the request, just log the error
    }

    console.log('✅ Booking confirmed successfully');
    res.json({ 
      success: true, 
      message: 'Booking confirmed and car marked as unavailable',
      booking_id: bookingId,
      car_id: booking.car_id
    });

  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Reject booking (car remains available)
router.put('/:id/reject', async (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  console.log('❌ Admin rejecting booking:', bookingId, 'Reason:', reason);
  
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      console.error('❌ Booking not pending, status:', booking.status);
      return res.status(400).json({ error: 'Booking is not pending confirmation' });
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Error updating booking status:', updateError);
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    console.log('✅ Booking rejected successfully');
    res.json({ 
      success: true, 
      message: 'Booking rejected successfully',
      booking_id: bookingId,
      reason: reason || 'No reason provided'
    });

  } catch (error) {
    console.error('❌ Error rejecting booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Delete booking
router.delete('/:id', async (req, res) => {
  const bookingId = req.params.id;
  
  console.log('🗑️ Deleting booking:', bookingId);
  
  try {
    // Get booking details first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Delete booking
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) {
      console.error('❌ Error deleting booking:', deleteError);
      return res.status(500).json({ error: 'Failed to delete booking' });
    }

    // If booking was confirmed, also remove from booked_cars
    if (booking.status === 'confirmed') {
      const { error: bookedCarError } = await supabaseAdmin
        .from('booked_cars')
        .delete()
        .eq('booking_id', bookingId);

      if (bookedCarError) {
        console.error('❌ Error removing from booked_cars:', bookedCarError);
      }

      // Mark car as available again
      const { error: carUpdateError } = await supabaseAdmin
        .from('cars')
        .update({ 
          booked: false, 
          booked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.car_id);

      if (carUpdateError) {
        console.error('❌ Error updating car status:', carUpdateError);
      }
    }

    console.log('✅ Booking deleted successfully');
    res.json({ 
      success: true, 
      message: 'Booking deleted successfully',
      booking_id: bookingId
    });

  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
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
});

module.exports = router; 