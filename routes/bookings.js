const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabaseClient');
const TelegramNotifier = require('../config/telegram');
const { trackPhoneNumberForBooking } = require('../lib/phoneNumberTracker');

// Import validation middleware and schemas
const { 
  validate, 
  validateParams,
  bookingCreateSchema, 
  bookingStatusSchema, 
  bookingIdSchema, 
  bookingRejectSchema 
} = require('../middleware/validation');

// Import authentication middleware
const { authenticateToken } = require('../middleware/auth');

// Create a new booking
router.post('/', validate(bookingCreateSchema), async (req, res) => {
  const {
    car_id,
    pickup_date,
    pickup_time,
    return_date,
    return_time,
    discount_code,
    pickup_location,
    dropoff_location,
    special_instructions,
    total_price,
    price_breakdown,
    customer_name,
    customer_email,
    customer_phone,
    customer_age
  } = req.body;



  // Validate required fields
  if (!car_id || !pickup_date || !pickup_time || !return_date || !return_time || 
      !pickup_location || !dropoff_location || !customer_age) {

    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate age
  const age = parseInt(customer_age);
  if (isNaN(age) || age < 18 || age > 100) {
    return res.status(400).json({ error: 'Age must be between 18 and 100 years' });
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
        // First try to validate as redemption code with phone number validation
        const customerPhone = customer_phone;
        const redemptionUrl = customerPhone 
          ? `${req.protocol}://${req.get('host')}/api/coupons/validate-redemption/${discount_code}?phone=${encodeURIComponent(customerPhone)}`
          : `${req.protocol}://${req.get('host')}/api/coupons/validate-redemption/${discount_code}`;
        
        const redemptionResponse = await fetch(redemptionUrl);
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
      pickup_location,
      dropoff_location,
      special_instructions,
      total_price,
      price_breakdown,
      insurance_type: 'Basic', // Default insurance type for database compatibility
      customer_name: customer_name || 'Not provided',
      customer_email: customer_email || 'Not provided',
      customer_phone: customer_phone || 'Not provided',
      customer_age: customer_age || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };



    const { data: newBooking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating booking:', error);
      return res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }



    // Send Telegram notification
    try {
      const telegram = new TelegramNotifier();
      const telegramData = {
        contact_person: customer_name || 'Not provided',
        contact_phone: customer_phone || 'Not provided',
        email: customer_email || 'Not provided',
        age: customer_age || 'Not provided',
        make_name: car.make_name,
        model_name: car.model_name,
        production_year: car.production_year,
        pickup_date,
        pickup_time,
        return_date,
        return_time,
        pickup_location,
        dropoff_location,

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
      const phoneNumber = customer_phone;
      if (phoneNumber) {
        const trackingResult = await trackPhoneNumberForBooking(phoneNumber, newBooking.id.toString());
        if (trackingResult.success) {
        } else {
          console.error('❌ Failed to track phone number:', trackingResult.error);
        }
      } else {
        
      }
    } catch (trackingError) {
      console.error('❌ Error tracking phone number:', trackingError);
      // Don't fail the booking creation if phone tracking fails
    }


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

    // Auto-mark confirmed bookings as finished if return date has passed
    const now = new Date();
    const bookingsToUpdate = [];
    
    for (const booking of bookings) {
      if (booking.status === 'confirmed') {
        const returnDateTime = new Date(`${booking.return_date}T${booking.return_time || '23:59'}`);
        if (returnDateTime < now) {
          bookingsToUpdate.push(booking.id);
        }
      }
    }
    
    // Update bookings to finished status
    if (bookingsToUpdate.length > 0) {
      
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ 
          status: 'finished',
          updated_at: new Date().toISOString() 
        })
        .in('id', bookingsToUpdate);
      
      if (updateError) {
        console.error('❌ Error auto-marking bookings as finished:', updateError);
      } else {
        
        // Update the local bookings array to reflect the status change
        bookings.forEach(booking => {
          if (bookingsToUpdate.includes(booking.id)) {
            booking.status = 'finished';
          }
        });
      }
    }

    res.json(bookings);

  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Update booking status
router.put('/:id/status', authenticateToken, validateParams(bookingIdSchema), validate(bookingStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  

  if (!status || !['pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'finished'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: pending, confirmed, cancelled, completed, rejected, or finished' });
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


    res.json({ success: true, booking: data });

  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Confirm booking and mark car as unavailable
router.put('/:id/confirm', authenticateToken, validateParams(bookingIdSchema), async (req, res) => {
  const bookingId = req.params.id;
  
  
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

    // Note: We no longer update the booked_until field since availability is calculated dynamically
    // The car's availability will be determined by checking all bookings (pending + confirmed)
    // when the cars API is called

    // No longer updating car status since availability is calculated dynamically

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

      insurance_type: 'Basic', // Default insurance type for database compatibility
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
      const phoneNumber = booking.customer_phone;
      if (phoneNumber) {
        
        const trackingResult = await trackPhoneNumberForBooking(phoneNumber, bookingId.toString());
        if (trackingResult.success) {
          
        } else {
          console.error('❌ Failed to track phone number:', trackingResult.error);
        }
      } else {
        
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

  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Admin: Cancel booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const bookingId = req.params.id;
  
  
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

    // If booking was confirmed, remove from booked_cars table
    // Note: We no longer update the car's booked_until field since availability is calculated dynamically
    if (booking.status === 'confirmed') {

      // Remove from booked_cars table
      const { error: bookedCarError } = await supabaseAdmin
        .from('booked_cars')
        .delete()
        .eq('booking_id', bookingId);

      if (bookedCarError) {
        console.error('❌ Error removing from booked_cars:', bookedCarError);
      }
    }


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
router.put('/:id/reject', authenticateToken, validateParams(bookingIdSchema), validate(bookingRejectSchema), async (req, res) => {
  const bookingId = req.params.id;
  const { reason } = req.body;
  
  
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

// Sober driver callback request
router.post('/sober-driver-callback', async (req, res) => {
  const { phone_number, customer_name, customer_email, special_instructions } = req.body;
  
  
  // Validate required fields
  if (!phone_number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Insert into sober_driver_callbacks table
    const { data: callback, error } = await supabase
      .from('sober_driver_callbacks')
      .insert([{
        phone_number,
        customer_name,
        customer_email,
        special_instructions,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating sober driver callback:', error);
      return res.status(500).json({ error: 'Failed to save callback request' });
    }



    // Send Telegram notification
    try {
      const telegram = new TelegramNotifier();
      const telegramData = {
        phone_number,
        customer_name,
        customer_email,
        special_instructions
      };
      await telegram.sendMessage(telegram.formatSoberDriverCallbackMessage(telegramData));
      
    } catch (telegramError) {
      console.error('❌ Error sending Telegram notification:', telegramError);
      // Don't fail the request if Telegram fails
    }

    res.json({ 
      success: true, 
      callback_id: callback.id,
      message: 'Callback request submitted successfully! We will call you back within minutes.'
    });

  } catch (error) {
    console.error('❌ Error processing sober driver callback:', error);
    res.status(500).json({ error: 'Failed to process callback request' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  
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

    res.json(booking);

  } catch (error) {
    console.error('❌ Error fetching booking:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Check if customer is returning (has existing bookings)
router.post('/check-returning-customer', async (req, res) => {
  const { phone_number } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Normalize phone number using the same logic as phoneNumberTracker
    const { normalizePhoneNumber } = require('../lib/phoneNumberTracker');
    const normalizedPhoneNumber = normalizePhoneNumber(phone_number);
    
    // Get phone number record from phone_numbers table
    const { data: phoneRecord, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, bookings_ids, return_gift_redeemed')
      .eq('phone_number', normalizedPhoneNumber)
      .single();

    if (phoneError && phoneError.code !== 'PGRST116') {
      console.error('❌ Error checking returning customer:', phoneError);
      return res.status(500).json({ error: 'Failed to check returning customer: ' + phoneError.message });
    }

    // Check if phone number exists and has bookings with unredeemed return gift
    let isReturningCustomer = false;
    let bookingsCount = 0;

    if (phoneRecord) {
      // Check if they have bookings_ids and return_gift_redeemed is false
      const hasBookings = phoneRecord.bookings_ids && phoneRecord.bookings_ids.length > 0;
      const hasUnredeemedGift = phoneRecord.return_gift_redeemed === false;
      
      isReturningCustomer = hasBookings && hasUnredeemedGift;
      bookingsCount = phoneRecord.bookings_ids ? phoneRecord.bookings_ids.length : 0;
    }

    res.json({ 
      success: true, 
      isReturningCustomer: isReturningCustomer,
      bookingsCount: bookingsCount
    });

  } catch (error) {
    console.error('❌ Error checking returning customer:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Mark return gift as redeemed for a customer
router.post('/mark-return-gift-redeemed', async (req, res) => {
  const { phone_number } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Normalize phone number using the same logic as phoneNumberTracker
    const { normalizePhoneNumber } = require('../lib/phoneNumberTracker');
    const normalizedPhoneNumber = normalizePhoneNumber(phone_number);
    
    // Update the phone_numbers table to mark return gift as redeemed
    const { data: updatedPhoneRecord, error: updateError } = await supabase
      .from('phone_numbers')
      .update({ 
        return_gift_redeemed: true
      })
      .eq('phone_number', normalizedPhoneNumber)
      .eq('return_gift_redeemed', false)
      .select('id, bookings_ids');

    if (updateError) {
      console.error('❌ Error marking return gift as redeemed:', updateError);
      return res.status(500).json({ error: 'Failed to mark return gift as redeemed: ' + updateError.message });
    }

    const updatedCount = updatedPhoneRecord ? updatedPhoneRecord.length : 0;
    const bookingsCount = updatedPhoneRecord && updatedPhoneRecord.length > 0 ? 
      (updatedPhoneRecord[0].bookings_ids ? updatedPhoneRecord[0].bookings_ids.length : 0) : 0;

    res.json({ 
      success: true, 
      message: `Return gift marked as redeemed for ${bookingsCount} booking(s)`,
      updatedCount: updatedCount,
      bookingsCount: bookingsCount
    });

  } catch (error) {
    console.error('❌ Error marking return gift as redeemed:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

module.exports = router; 