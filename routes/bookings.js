const express = require("express");
const router = express.Router();
const { supabase, supabaseAdmin } = require("../lib/supabaseClient");
const TelegramNotifier = require("../config/telegram");
const { trackPhoneNumberForBooking } = require("../lib/phoneNumberTracker");

// Import validation middleware and schemas
const {
  validate,
  validateParams,
  bookingCreateSchema,
  bookingStatusSchema,
  bookingIdSchema,
  bookingRejectSchema,
} = require("../middleware/validation");

// Import authentication middleware
const { authenticateToken } = require("../middleware/auth");

// Create a new booking
router.post("/", validate(bookingCreateSchema), async (req, res) => {
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
    customer_age,
  } = req.body;

  // Validate required fields
  if (
    !car_id ||
    !pickup_date ||
    !pickup_time ||
    !return_date ||
    !return_time ||
    !pickup_location ||
    !dropoff_location ||
    !customer_age
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate age
  const age = parseInt(customer_age);
  if (isNaN(age) || age < 18 || age > 100) {
    return res
      .status(400)
      .json({ error: "Age must be between 18 and 100 years" });
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
    return res
      .status(400)
      .json({ error: "Pickup date must be today or in the future" });
  }

  // if (returnDateTime <= pickupDateTime) {
  //   return res.status(400).json({ error: 'Return date must be after pickup date' });
  // }

  try {
    // Check if car exists
    const { data: car, error: carError } = await supabase
      .from("cars")
      .select("*")
      .eq("id", car_id)
      .single();

    if (carError || !car) {
      return res.status(404).json({ error: "Car not found" });
    }

    // If discount code is provided, validate it and mark as used if it's a redemption code
    // If discount code is provided, validate it using the new lookup endpoint
    let validatedDiscountCode = discount_code;
    let couponDetails = null;
    if (discount_code) {
      try {
        // Use the new lookup endpoint for efficient validation
        const customerPhone = customer_phone;
        const lookupUrl = customerPhone
          ? `${req.protocol}://${req.get(
              "host"
            )}/api/coupons/lookup/${discount_code}?phone=${encodeURIComponent(
              customerPhone
            )}`
          : `${req.protocol}://${req.get(
              "host"
            )}/api/coupons/lookup/${discount_code}`;

        const lookupResponse = await fetch(lookupUrl);
        const lookupResult = await lookupResponse.json();

        if (lookupResult.valid) {
          couponDetails = {
            type: lookupResult.type,
            discount_percentage: lookupResult.discount_percentage,
            free_days: lookupResult.free_days,
            code: discount_code,
            coupon_id: lookupResult.coupon_id,
            redemption_id: lookupResult.redemption_id,
          };

          // ONLY mark redemption codes as redeemed (not main coupon codes)
          if (
            lookupResult.type === "redemption_code" &&
            lookupResult.redemption_id
          ) {
            const { error: redeemError } = await supabase
              .from("coupon_redemptions")
              .update({
                status: "redeemed",
                redeemed_at: new Date().toISOString(),
                redeemed_by_phone: customer_phone || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", lookupResult.redemption_id);

            if (redeemError) {
              console.error(
                "❌ Error marking redemption code as redeemed:",
                redeemError
              );
              // Don't fail the booking, just log the error
            } else {
            }
          } else if (lookupResult.type === "main_coupon") {
            // Main coupon codes (like "WELCOME10") are NOT tracked in coupon_redemptions
          }
        } else {
          // Coupon is not valid
          validatedDiscountCode = null;
        }
      } catch (error) {
        console.error("❌ Error validating discount code:", error);
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
      insurance_type: "Basic", // Default insurance type for database compatibility
      customer_name: customer_name || "Not provided",
      customer_email: customer_email || "Not provided",
      customer_phone: customer_phone || "Not provided",
      customer_age: customer_age || null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newBooking, error } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating booking:", error);
      return res
        .status(500)
        .json({ error: "Failed to create booking: " + error.message });
    }

    // Send Telegram notification
    try {
      const telegram = new TelegramNotifier();
      const telegramData = {
        contact_person: customer_name || "Not provided",
        contact_phone: customer_phone || "Not provided",
        email: customer_email || "Not provided",
        age: customer_age || "Not provided",
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
        discount_code: validatedDiscountCode,
        coupon_details: couponDetails,
      };
      await telegram.sendMessage(telegram.formatBookingMessage(telegramData));
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
    }

    // Phone number tracking is now handled when booking is approved/confirmed by admin

    res.json({
      success: true,
      booking_id: newBooking.id,
      message:
        "Booking request submitted successfully! We will contact you shortly to confirm your reservation.",
      status: "pending",
    });
  } catch (error) {
    console.error("❌ Supabase error creating booking:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Admin: Get all bookings
router.get("/", async (req, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        cars (
          make_name,
          model_name,
          production_year,
          head_image
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching bookings:", error);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }

    // Get all unique discount codes from bookings
        // Get all unique discount codes from bookings
        const discountCodes = [...new Set(bookings.map(b => b.discount_code).filter(Boolean))];
    
        // Fetch all coupon details in one query for main coupons
        const { data: mainCoupons, error: mainCouponsError } = await supabase
          .from('coupon_codes')
          .select('*')
          .in('code', discountCodes)
          .eq('is_active', true);
    
        // Fetch all coupon details in one query for redemption codes
        const { data: redemptionCoupons, error: redemptionError } = await supabase
          .from('coupon_redemptions')
          .select(`
            *,
            coupon_codes!coupon_redemptions_coupon_id_fkey (
              id,
              type,
              discount_percentage,
              free_days,
              description,
              expires_at,
              is_active
            )
          `)
          .in('redemption_code', discountCodes);
    
        // Create lookup maps for efficient access
        const mainCouponsMap = new Map();
        if (mainCoupons) {
          mainCoupons.forEach(coupon => {
            mainCouponsMap.set(coupon.code, {
              type: 'main_coupon',
              discount_percentage: coupon.discount_percentage,
              free_days: coupon.free_days,
              description: coupon.description,
              coupon_id: coupon.id
            });
          });
        }
    
        const redemptionCouponsMap = new Map();
        if (redemptionCoupons) {
          redemptionCoupons.forEach(redemption => {
            const coupon = redemption.coupon_codes;
            if (coupon && coupon.is_active) {
              redemptionCouponsMap.set(redemption.redemption_code, {
                type: 'redemption_code',
                discount_percentage: coupon.discount_percentage,
                free_days: coupon.free_days,
                description: coupon.description,
                coupon_id: coupon.id,
                redemption_id: redemption.id
              });
            }
          });
        }
    
        // Enhance bookings with coupon details using the lookup maps
        const enhancedBookings = bookings.map(booking => {
          let couponDetails = null;
    
          if (booking.discount_code) {
            // Check main coupons first
            if (mainCouponsMap.has(booking.discount_code)) {
              couponDetails = {
                code: booking.discount_code,
                ...mainCouponsMap.get(booking.discount_code)
              };
            }
            // Check redemption codes second
            else if (redemptionCouponsMap.has(booking.discount_code)) {
              couponDetails = {
                code: booking.discount_code,
                ...redemptionCouponsMap.get(booking.discount_code)
              };
            }
          }
    
          return {
            ...booking,
            coupon_details: couponDetails,
          };
        });

    // Auto-mark confirmed bookings as finished if return date has passed
       const now = new Date();
       const bookingsToUpdate = [];
   
       for (const booking of enhancedBookings) {
         if (booking.status === "confirmed") {
           // For same-day bookings, only mark as finished if return time has passed
           // For multi-day bookings, mark as finished if return date has passed
           const pickupDate = new Date(booking.pickup_date);
           const returnDate = new Date(booking.return_date);
           const isSameDay = pickupDate.toDateString() === returnDate.toDateString();
           
           if (isSameDay) {
             // Same-day booking: check if return time has passed
             const returnDateTime = new Date(
               `${booking.return_date}T${booking.return_time || "23:59"}`
             );
             if (returnDateTime < now) {
               bookingsToUpdate.push(booking.id);
             }
           } else {
             // Multi-day booking: check if return date has passed (ignore time)
             const returnDateOnly = new Date(booking.return_date);
             const today = new Date();
             today.setHours(0, 0, 0, 0); // Reset time to start of day
             returnDateOnly.setHours(0, 0, 0, 0); // Reset time to start of day
             
             if (returnDateOnly < today) {
               bookingsToUpdate.push(booking.id);
             }
           }
         }
       }

    // Update bookings to finished status if needed
    if (bookingsToUpdate.length > 0) {
      await supabase
        .from("bookings")
        .update({ status: "finished" })
        .in("id", bookingsToUpdate);
    }

    res.json(enhancedBookings);
  } catch (error) {
    console.error("❌ Supabase error fetching bookings:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Admin: Update booking status
router.put(
  "/:id/status",
  authenticateToken,
  validateParams(bookingIdSchema),
  validate(bookingStatusSchema),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      ![
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "rejected",
        "finished",
      ].includes(status)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid status. Must be: pending, confirmed, cancelled, completed, rejected, or finished",
        });
    }

    try {
      // Get booking details first to check if we need to track phone number
      const { data: existingBooking, error: fetchError } = await supabase
        .from("bookings")
        .select("customer_phone")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("❌ Error fetching booking details:", fetchError);
        return res
          .status(500)
          .json({ error: "Failed to fetch booking details" });
      }

      const { data, error } = await supabaseAdmin
        .from("bookings")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating booking status:", error);
        return res
          .status(500)
          .json({ error: "Failed to update booking status" });
      }

      if (!data) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Track phone number if booking is being confirmed
      if (
        status === "confirmed" &&
        existingBooking &&
        existingBooking.customer_phone
      ) {
        try {
          const trackingResult = await trackPhoneNumberForBooking(
            existingBooking.customer_phone,
            id.toString()
          );
          if (trackingResult.success) {
          } else {
            console.error(
              "❌ Failed to track phone number:",
              trackingResult.error
            );
          }
        } catch (trackingError) {
          console.error("❌ Error tracking phone number:", trackingError);
          // Don't fail the status update if phone tracking fails
        }
      }

      res.json({ success: true, booking: data });
    } catch (error) {
      console.error("❌ Error updating booking status:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Admin: Confirm booking and mark car as unavailable
router.put(
  "/:id/confirm",
  authenticateToken,
  validateParams(bookingIdSchema),
  async (req, res) => {
    const bookingId = req.params.id;

    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        console.error("❌ Booking not found:", bookingError);
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.status !== "pending") {
        console.error("❌ Booking is not pending, status:", booking.status);
        return res
          .status(400)
          .json({ error: "Booking is not pending confirmation" });
      }

      // Update booking status to confirmed
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

        
      if (updateError) {
        console.error("❌ Error updating booking status:", updateError);
        return res
          .status(500)
          .json({ error: "Failed to update booking status" });
      }

      // Note: We no longer update the booked_until field since availability is calculated dynamically
      // The car's availability will be determined by checking all bookings (pending + confirmed)
      // when the cars API is called

      // No longer updating car status since availability is calculated dynamically

      // Insert into booked_cars table for active rentals tracking
      const bookedCarData = {
        car_id: booking.car_id,
        booking_id: bookingId,
        customer_name: booking.customer_name || "Not provided",
        customer_email: booking.customer_email || "Not provided",
        customer_phone: booking.customer_phone || "Not provided",
        pickup_date: booking.pickup_date,
        pickup_time: booking.pickup_time,
        return_date: booking.return_date,
        return_time: booking.return_time,

        insurance_type: "Basic", // Default insurance type for database compatibility
        pickup_location: booking.pickup_location,
        dropoff_location: booking.dropoff_location,
        total_price: booking.total_price || 0,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: bookedCarError } = await supabaseAdmin
        .from("booked_cars")
        .insert(bookedCarData);

      if (bookedCarError) {
        console.error("❌ Error inserting into booked_cars:", bookedCarError);
        // Don't fail the request, just log the error
      }

      // Track phone number for this booking (when confirmed)
      try {
        const phoneNumber = booking.customer_phone;
        if (phoneNumber) {
          const trackingResult = await trackPhoneNumberForBooking(
            phoneNumber,
            bookingId.toString()
          );
          if (trackingResult.success) {
          } else {
            console.error(
              "❌ Failed to track phone number:",
              trackingResult.error
            );
          }
        } else {
        }
      } catch (trackingError) {
        console.error("❌ Error tracking phone number:", trackingError);
        // Don't fail the booking confirmation if phone tracking fails
      }

      res.json({
        success: true,
        message: "Booking confirmed and car marked as unavailable",
        booking_id: bookingId,
        car_id: booking.car_id,
      });
    } catch (error) {
      console.error("❌ Error confirming booking:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Admin: Cancel booking
router.put("/:id/cancel", authenticateToken, async (req, res) => {
  const bookingId = req.params.id;

  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("❌ Booking not found:", bookingError);
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("❌ Error updating booking status:", updateError);
      return res.status(500).json({ error: "Failed to cancel booking" });
    }

    if (booking.discount_code) {
      const restoreResult = await restoreCouponToAvailable(booking.discount_code, booking.customer_phone);
      if (!restoreResult.success) {
        console.error("Failed to restore coupon:", restoreResult.error);
        // Don't fail the booking cancellation, just log the error
      }
    }

    // If booking was confirmed, remove from booked_cars table
    // Note: We no longer update the car's booked_until field since availability is calculated dynamically
    if (booking.status === "confirmed") {
      // Remove from booked_cars table
      const { error: bookedCarError } = await supabaseAdmin
        .from("booked_cars")
        .delete()
        .eq("booking_id", bookingId);

      if (bookedCarError) {
        console.error("❌ Error removing from booked_cars:", bookedCarError);
      }
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      booking_id: bookingId,
    });
  } catch (error) {
    console.error("❌ Error cancelling booking:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Admin: Reject booking
router.put(
  "/:id/reject",
  authenticateToken,
  validateParams(bookingIdSchema),
  validate(bookingRejectSchema),
  async (req, res) => {
    const bookingId = req.params.id;
    const { reason } = req.body;

    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();
  
      if (bookingError || !booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
  
      // Update booking status to rejected
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
  
      if (updateError) {
        return res.status(500).json({ error: "Failed to reject booking" });
      }
      
  
      // ✅ CORRECT: Restore coupon immediately
      if (booking.discount_code) {
        const restoreResult = await restoreCouponToAvailable(
          booking.discount_code, 
          booking.customer_phone
        );
        
        if (!restoreResult.success) {
          console.error("Failed to restore coupon:", restoreResult.error);
          // Don't fail the booking rejection, just log the error
        }
      }
  
      res.json({
        success: true,
        message: "Booking rejected successfully",
        booking_id: bookingId,
      });
    } catch (error) {
      console.error("❌ Error rejecting booking:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Helper function to restore coupon to available
async function restoreCouponToAvailable(discountCode, customerPhone) {
  try {
    console.log(`�� Attempting to restore coupon: ${discountCode}`);
    
    // Find the redemption record
    const { data: redemption, error: findError } = await supabase
      .from("coupon_redemptions")
      .select("*")
      .eq("redemption_code", discountCode.toUpperCase())
      .single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        // No redemption record found - this might be a main coupon code
        console.log(`ℹ️ No redemption record found for code: ${discountCode} (might be main coupon)`);
        return { success: true, message: "No redemption record to restore" };
      }
      console.error("❌ Error finding redemption record:", findError);
      return { success: false, error: findError.message };
    }

    if (!redemption) {
      console.log(`ℹ️ No redemption record found for code: ${discountCode}`);
      return { success: true, message: "No redemption record to restore" };
    }

    // Check if coupon is actually redeemed
    if (redemption.status !== "redeemed") {
      console.log(`ℹ️ Coupon ${discountCode} is not redeemed (status: ${redemption.status}), no need to restore`);
      return { success: true, message: "Coupon not redeemed, no restoration needed" };
    }

    // Restore to available status
    const { error: updateError } = await supabase
      .from("coupon_redemptions")
      .update({
        status: "available", // Restore to available
        redeemed_at: null,
        redeemed_by_phone: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", redemption.id);

    if (updateError) {
      console.error("❌ Error restoring coupon:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Coupon ${discountCode} successfully restored to available`);
    return { 
      success: true, 
      message: `Coupon ${discountCode} restored to available`,
      couponId: redemption.id 
    };

  } catch (error) {
    console.error("❌ Error in restoreCouponToAvailable:", error);
    return { success: false, error: error.message };
  }
}

// Sober driver callback request
router.post("/sofer-treaz-callback", async (req, res) => {
  const { phone_number, customer_name, customer_email, special_instructions } =
    req.body;

  // Validate required fields
  if (!phone_number) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    // Insert into sober_driver_callbacks table
    const { data: callback, error } = await supabase
      .from("sober_driver_callbacks")
      .insert([
        {
          phone_number,
          customer_name,
          customer_email,
          special_instructions,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating sober driver callback:", error);
      return res.status(500).json({ error: "Failed to save callback request" });
    }

    // Send Telegram notification
    try {
      const telegram = new TelegramNotifier();
      const telegramData = {
        phone_number,
        customer_name,
        customer_email,
        special_instructions,
      };
      await telegram.sendMessage(
        telegram.formatSoberDriverCallbackMessage(telegramData)
      );
    } catch (telegramError) {
      console.error("❌ Error sending Telegram notification:", telegramError);
      // Don't fail the request if Telegram fails
    }

    res.json({
      success: true,
      callback_id: callback.id,
      message:
        "Callback request submitted successfully! We will call you back within minutes.",
    });
  } catch (error) {
    console.error("❌ Error processing sober driver callback:", error);
    res.status(500).json({ error: "Failed to process callback request" });
  }
});

// Get booking by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        cars (
          make_name,
          model_name,
          production_year
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Error fetching booking:", error);
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("❌ Error fetching booking:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Check if customer is returning (has existing bookings)
router.post("/check-returning-customer", async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    // Normalize phone number using the same logic as phoneNumberTracker
    const { normalizePhoneNumber } = require("../lib/phoneNumberTracker");
    const normalizedPhoneNumber = normalizePhoneNumber(phone_number);

    // Get phone number record from phone_numbers table
    const { data: phoneRecord, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("id, phone_number, bookings_ids, return_gift_redeemed")
      .eq("phone_number", normalizedPhoneNumber)
      .single();

    if (phoneError && phoneError.code !== "PGRST116") {
      console.error("❌ Error checking returning customer:", phoneError);
      return res
        .status(500)
        .json({
          error: "Failed to check returning customer: " + phoneError.message,
        });
    }

    // Get the configurable booking trigger number from global_settings
    let bookingTriggerNumber = 2; // Default value
    try {
      const { data: settings, error: settingsError } = await supabase
        .from("global_settings")
        .select("setting_value")
        .eq("setting_key", "returning_customer_booking_trigger")
        .single();

      if (settings && !settingsError) {
        bookingTriggerNumber = parseInt(settings.setting_value) || 2;
      }
    } catch (error) {
      console.error("❌ Error fetching booking trigger number:", error);
    }

    // Check if phone number exists and meets the configurable booking criteria
    let isReturningCustomer = false;
    let bookingsCount = 0;
    let nextBookingNumber = 0;

    if (phoneRecord) {
      bookingsCount = phoneRecord.bookings_ids
        ? phoneRecord.bookings_ids.length
        : 0;
      nextBookingNumber = bookingsCount + 1; // Next booking will be this number

      // Check if the next booking number matches the trigger interval
      // e.g., if trigger is 2, show popup on 2nd, 4th, 6th, etc. bookings
      isReturningCustomer = nextBookingNumber % bookingTriggerNumber === 0;
    }

    res.json({
      success: true,
      isReturningCustomer: isReturningCustomer,
      bookingsCount: bookingsCount,
      nextBookingNumber: nextBookingNumber,
      bookingTriggerNumber: bookingTriggerNumber,
    });
  } catch (error) {
    console.error("❌ Error checking returning customer:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Mark return gift as redeemed for a customer
router.post("/mark-return-gift-redeemed", async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    // Normalize phone number using the same logic as phoneNumberTracker
    const { normalizePhoneNumber } = require("../lib/phoneNumberTracker");
    const normalizedPhoneNumber = normalizePhoneNumber(phone_number);

    // Update the phone_numbers table to mark return gift as redeemed
    const { data: updatedPhoneRecord, error: updateError } = await supabase
      .from("phone_numbers")
      .update({
        return_gift_redeemed: true,
      })
      .eq("phone_number", normalizedPhoneNumber)
      .eq("return_gift_redeemed", false)
      .select("id, bookings_ids");

    if (updateError) {
      console.error("❌ Error marking return gift as redeemed:", updateError);
      return res
        .status(500)
        .json({
          error:
            "Failed to mark return gift as redeemed: " + updateError.message,
        });
    }

    const updatedCount = updatedPhoneRecord ? updatedPhoneRecord.length : 0;
    const bookingsCount =
      updatedPhoneRecord && updatedPhoneRecord.length > 0
        ? updatedPhoneRecord[0].bookings_ids
          ? updatedPhoneRecord[0].bookings_ids.length
          : 0
        : 0;

    res.json({
      success: true,
      message: `Return gift marked as redeemed for ${bookingsCount} booking(s)`,
      updatedCount: updatedCount,
      bookingsCount: bookingsCount,
    });
  } catch (error) {
    console.error("❌ Error marking return gift as redeemed:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

module.exports = router;
