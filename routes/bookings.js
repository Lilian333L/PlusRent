const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabaseClient');
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
        } else {
          // If not a valid redemption code, try regular coupon validation
          const response = await fetch(`${req.protocol}://${req.get('host')}/api/coupons/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: discount_code })
          });
          
          const result = await response.json();
          if (!result.valid) {
            validatedDiscountCode = null;
            console.log('Invalid discount code provided');
          }
        }
      } catch (error) {
        console.error('Error validating discount code:', error);
        validatedDiscountCode = null;
      }
    }

    // Create booking in Supabase
    const bookingData = {
      car_id,
      pickup_date,
      pickup_time,
      return_date,
      return_time,
      discount_code: validatedDiscountCode,
      insurance_type,
      pickup_location,
      dropoff_location,
      special_instructions,
      total_price,
      price_breakdown,
      customer_name: customer_name || contact_person || 'Not provided',
      customer_email: customer_email || 'Not provided',
      customer_phone: customer_phone || contact_phone || 'Not provided',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📊 Creating booking with data:', bookingData);

    const { data: newBooking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating booking:', error);
      return res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }

    console.log('✅ Booking created in Supabase:', newBooking);

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
});

// Admin: Get all bookings
router.get('/', async (req, res) => {
  console.log('📋 Fetching all bookings from Supabase');
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars (
          make_name,
          model_name,
          production_year,
          head_image
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }

    console.log(`✅ Found ${bookings.length} bookings`);
    res.json(bookings);

  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Update booking status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`📝 Updating booking ${id} status to: ${status}`);

  if (!status || !['pending', 'confirmed', 'cancelled', 'completed', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: pending, confirmed, cancelled, completed, or rejected' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating booking status:', error);
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('✅ Booking status updated successfully');
    res.json({ success: true, booking: data });

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
      total_price: booking.total_price || 0,
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

    // Track phone number for this booking (when confirmed)
    try {
      const phoneNumber = booking.customer_phone || booking.contact_phone;
      if (phoneNumber) {
        console.log(`📞 Tracking phone number for confirmed booking: ${phoneNumber}`);
        const trackingResult = await trackPhoneNumberForBooking(phoneNumber, bookingId.toString());
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
      // Don't fail the booking confirmation if phone tracking fails
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

// Admin: Cancel booking
router.put('/:id/cancel', async (req, res) => {
  const bookingId = req.params.id;
  
  console.log('❌ Admin cancelling booking:', bookingId);
  
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
      return res.status(500).json({ error: 'Failed to cancel booking' });
    }

    // If booking was confirmed, free up the car
    if (booking.status === 'confirmed') {
      // Mark car as available
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

      // Remove from booked_cars table
      const { error: bookedCarError } = await supabaseAdmin
        .from('booked_cars')
        .delete()
        .eq('booking_id', bookingId);

      if (bookedCarError) {
        console.error('❌ Error removing from booked_cars:', bookedCarError);
      }
    }

    console.log('✅ Booking cancelled successfully');
    res.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      booking_id: bookingId 
    });

  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Reject booking
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
      console.error('❌ Booking is not pending, status:', booking.status);
      return res.status(400).json({ error: 'Only pending bookings can be rejected' });
    }

    // Update booking status to rejected
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Error updating booking status:', updateError);
      return res.status(500).json({ error: 'Failed to reject booking' });
    }

    console.log('✅ Booking rejected successfully');
    res.json({ 
      success: true, 
      message: 'Booking rejected successfully',
      booking_id: bookingId 
    });

  } catch (error) {
    console.error('❌ Error rejecting booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log(`📋 Fetching booking ${id} from Supabase`);
  
  try {
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching booking:', error);
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('✅ Booking found');
    res.json(booking);

  } catch (error) {
    console.error('❌ Error fetching booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

module.exports = router; 