const express = require("express");
const router = express.Router();
const { supabase } = require("../lib/supabaseClient");
// const TelegramNotifier = require('../config/telegram');

// Import validation middleware and schemas
const {
  validate,
  validateParams,
  couponCreateSchema,
  couponUpdateSchema,
  couponIdSchema,
  couponUseSchema,
  customer_phone,
  couponWheelSchema,
} = require("../middleware/validation");

// Import authentication middleware
const { authenticateToken } = require("../middleware/auth");

// Get all coupon codes
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("coupon_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error fetching coupons:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Supabase error fetching coupons:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Toggle wheel enabled status for a coupon (Admin only)
router.patch("/:id/toggle-wheel", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const wheelId = req.query.wheelId; // Get wheel ID from query parameter

  if (!wheelId) {
    return res.status(400).json({ error: "Wheel ID is required" });
  }

  try {
    // Check if coupon exists
    const { data: coupon, error: couponError } = await supabase
      .from("coupon_codes")
      .select("id")
      .eq("id", id)
      .single();

    if (couponError || !coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Check if wheel exists
    const { data: wheel, error: wheelError } = await supabase
      .from("spinning_wheels")
      .select("id")
      .eq("id", wheelId)
      .single();

    if (wheelError || !wheel) {
      return res.status(404).json({ error: "Wheel not found" });
    }

    // Check if coupon is already enabled for this wheel
    const { data: existing, error: existingError } = await supabase
      .from("wheel_coupons")
      .select("id")
      .eq("wheel_id", wheelId)
      .eq("coupon_id", id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing wheel coupon:", existingError);
      return res.status(500).json({ error: "Database error" });
    }

    if (existing) {
      // Remove from wheel

      const { error: deleteError } = await supabase
        .from("wheel_coupons")
        .delete()
        .eq("wheel_id", wheelId)
        .eq("coupon_id", id);

      if (deleteError) {
        console.error("Delete error details:", {
          error: deleteError,
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
          wheelId: wheelId,
          couponId: id,
        });
        return res.status(500).json({
          error: "Database error",
          details: deleteError.message || "Failed to disable coupon for wheel",
        });
      }

      res.json({ success: true, wheel_enabled: false });
    } else {
      // Add to wheel

      const { data: insertData, error: insertError } = await supabase
        .from("wheel_coupons")
        .insert([{ wheel_id: wheelId, coupon_id: id }])
        .select();

      if (insertError) {
        console.error("Insert error details:", {
          error: insertError,
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          wheelId: wheelId,
          couponId: id,
        });
        return res.status(500).json({
          error: "Database error",
          details: insertError.message || "Failed to enable coupon for wheel",
        });
      }

      res.json({ success: true, wheel_enabled: true });
    }
  } catch (error) {
    console.error("Toggle wheel error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update dynamic coupon fields (available_codes and showed_codes)
router.patch("/:id/dynamic-fields", authenticateToken, async (req, res) => {
  const couponId = req.params.id;
  const { available_codes, showed_codes } = req.body;

  if (available_codes === undefined && showed_codes === undefined) {
    return res
      .status(400)
      .json({
        error:
          "At least one field (available_codes or showed_codes) must be provided",
      });
  }

  // Validate available_codes if provided
  if (available_codes !== undefined) {
    if (!Array.isArray(available_codes)) {
      return res
        .status(400)
        .json({ error: "available_codes must be an array" });
    }
    // Validate each code in the array
    for (let i = 0; i < available_codes.length; i++) {
      if (
        typeof available_codes[i] !== "string" ||
        available_codes[i].trim() === ""
      ) {
        return res
          .status(400)
          .json({ error: `available_codes[${i}] must be a non-empty string` });
      }
    }
  }

  // Validate showed_codes if provided
  if (showed_codes !== undefined) {
    if (!Array.isArray(showed_codes)) {
      return res.status(400).json({ error: "showed_codes must be an array" });
    }
    // Validate each code in the array
    for (let i = 0; i < showed_codes.length; i++) {
      if (
        typeof showed_codes[i] !== "string" ||
        showed_codes[i].trim() === ""
      ) {
        return res
          .status(400)
          .json({ error: `showed_codes[${i}] must be a non-empty string` });
      }
    }
  }

  try {
    // Check if coupon exists
    const { data: existingCoupon, error: checkError } = await supabase
      .from("coupon_codes")
      .select("id")
      .eq("id", couponId)
      .single();

    if (checkError || !existingCoupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Prepare update data
    const updateData = {};
    if (available_codes !== undefined) {
      updateData.available_codes = JSON.stringify(available_codes);
    }
    if (showed_codes !== undefined) {
      updateData.showed_codes = JSON.stringify(showed_codes);
    }

    // Update the dynamic fields
    const { data, error } = await supabase
      .from("coupon_codes")
      .update(updateData)
      .eq("id", couponId)
      .select();

    if (error) {
      console.error("❌ Supabase error updating dynamic fields:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    res.json({
      success: true,
      available_codes:
        available_codes !== undefined ? available_codes : undefined,
      showed_codes: showed_codes !== undefined ? showed_codes : undefined,
    });
  } catch (error) {
    console.error("❌ Supabase error updating dynamic fields:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Update coupon percentage for a specific wheel
router.patch("/:id/wheel-percentage", authenticateToken, async (req, res) => {
  const couponId = req.params.id;
  const { wheelId, percentage } = req.body;

  if (!wheelId || percentage === undefined) {
    return res
      .status(400)
      .json({ error: "Wheel ID and percentage are required" });
  }

  // Validate percentage
  const numPercentage = parseFloat(percentage);
  if (isNaN(numPercentage) || numPercentage < 0 || numPercentage > 100) {
    return res
      .status(400)
      .json({ error: "Percentage must be between 0 and 100" });
  }

  try {
    // Check if coupon exists
    const { data: coupon, error: couponError } = await supabase
      .from("coupon_codes")
      .select("id")
      .eq("id", couponId)
      .single();

    if (couponError || !coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Check if wheel exists
    const { data: wheel, error: wheelError } = await supabase
      .from("spinning_wheels")
      .select("id")
      .eq("id", wheelId)
      .single();

    if (wheelError || !wheel) {
      return res.status(404).json({ error: "Wheel not found" });
    }

    // Check if coupon is enabled for this wheel
    const { data: existing, error: existingError } = await supabase
      .from("wheel_coupons")
      .select("id")
      .eq("wheel_id", wheelId)
      .eq("coupon_id", couponId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing wheel coupon:", existingError);
      return res.status(500).json({ error: "Database error" });
    }

    if (!existing) {
      return res
        .status(400)
        .json({ error: "Coupon is not enabled for this wheel" });
    }

    // Update the percentage
    const { error: updateError } = await supabase
      .from("wheel_coupons")
      .update({ percentage: numPercentage })
      .eq("wheel_id", wheelId)
      .eq("coupon_id", couponId);

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ success: true, percentage: numPercentage });
  } catch (error) {
    console.error("Wheel percentage update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get single coupon code
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const { data, error } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Supabase error fetching coupon:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Supabase error fetching coupon:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Add new coupon code
router.post(
  "/",
  authenticateToken,
  validate(couponCreateSchema),
  async (req, res) => {
    try {
      const {
        code,
        type,
        discount_percentage,
        free_days,
        description,
        expires_at,
      } = req.body;

      if (!code || !type) {
        return res.status(400).json({ error: "Code and type are required" });
      }

      if (type !== "percentage" && type !== "free_days") {
        return res
          .status(400)
          .json({ error: 'Type must be either "percentage" or "free_days"' });
      }

      let discountValue = null;
      let freeDaysValue = null;

      if (type === "percentage") {
        if (!discount_percentage) {
          return res
            .status(400)
            .json({
              error: "Discount percentage is required for percentage type",
            });
        }
        discountValue = parseFloat(discount_percentage);
        if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
          return res
            .status(400)
            .json({ error: "Discount percentage must be between 0 and 100" });
        }
      } else if (type === "free_days") {
        if (!free_days) {
          return res
            .status(400)
            .json({ error: "Free days is required for free_days type" });
        }
        freeDaysValue = parseInt(free_days);
        if (isNaN(freeDaysValue) || freeDaysValue <= 0) {
          return res
            .status(400)
            .json({ error: "Free days must be a positive number" });
        }
      }
      try {
        // Prepare coupon data for Supabase
        const couponData = {
          code: code.toUpperCase(),
          type,
          discount_percentage: discountValue,
          free_days: freeDaysValue,
          description: description || null,
          expires_at: expires_at || null,
          wheel_enabled: false,
          available_codes: "[]",
          showed_codes: "[]",
          is_active: true,
        };

        // Remove null/undefined values to avoid Supabase errors
        Object.keys(couponData).forEach((key) => {
          if (couponData[key] === null || couponData[key] === undefined) {
            delete couponData[key];
          }
        });

        const { data, error } = await supabase
          .from("coupon_codes")
          .insert(couponData)
          .select();

        if (error) {
          console.error("❌ Supabase coupon creation error:", error);
          if (error.message.includes("duplicate key")) {
            return res
              .status(400)
              .json({ error: "Coupon code already exists" });
          }
          return res
            .status(500)
            .json({ error: "Database error: " + error.message });
        }

        // Send Telegram notification
        try {
          const telegram = new TelegramNotifier();
          const telegramCouponData = {
            code: code.toUpperCase(),
            type: type,
            discount_percentage: discountValue,
            free_days: freeDaysValue,
            description: description || null,
            expires_at: expires_at || null,
            is_active: true,
          };
          await telegram.sendMessage(
            telegram.formatCouponAddedMessage(telegramCouponData)
          );
        } catch (error) {
          console.error("Error sending Telegram notification:", error);
        }

        res.json({ success: true, id: data[0].id });
      } catch (error) {
        console.error("❌ Supabase coupon creation error:", error);
        res.status(500).json({ error: "Database error: " + error.message });
      }
    } catch (error) {
      console.error("Unexpected error in POST /coupons:", error);
      return res
        .status(500)
        .json({ error: "Internal server error: " + error.message });
    }
  }
);

// Catch-all route to see what requests are coming in
router.use("*", (req, res, next) => {
  next();
});

// Update coupon code
router.put(
  "/:id",
  authenticateToken,
  validateParams(couponIdSchema),
  validate(couponUpdateSchema),
  async (req, res) => {
    const id = req.params.id;

    const {
      code,
      type,
      discount_percentage,
      free_days,
      description,
      is_active,
      expires_at,
    } = req.body;

    if (!code || !type) {
      return res.status(400).json({ error: "Code and type are required" });
    }

    if (type !== "percentage" && type !== "free_days") {
      return res
        .status(400)
        .json({ error: 'Type must be either "percentage" or "free_days"' });
    }

    let discountValue = null;
    let freeDaysValue = null;

    if (type === "percentage") {
      if (!discount_percentage) {
        return res
          .status(400)
          .json({
            error: "Discount percentage is required for percentage type",
          });
      }
      discountValue = parseFloat(discount_percentage);
      if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
        return res
          .status(400)
          .json({ error: "Discount percentage must be between 0 and 100" });
      }
    } else if (type === "free_days") {
      if (!free_days) {
        return res
          .status(400)
          .json({ error: "Free days is required for free_days type" });
      }
      freeDaysValue = parseInt(free_days);
      if (isNaN(freeDaysValue) || freeDaysValue <= 0) {
        return res
          .status(400)
          .json({ error: "Free days must be a positive number" });
      }
    }

    const isActiveValue = is_active === "1" || is_active === true ? 1 : 0;

    try {
      // Prepare update data for Supabase
      const updateData = {
        code: code.toUpperCase(),
        type,
        discount_percentage: discountValue,
        free_days: freeDaysValue,
        description: description || null,
        is_active: isActiveValue === 1,
        expires_at: expires_at || null,
      };

      // Remove null/undefined values to avoid Supabase errors
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from("coupon_codes")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) {
        console.error("❌ Supabase coupon update error:", error);
        if (error.message.includes("duplicate key")) {
          return res.status(400).json({ error: "Coupon code already exists" });
        }
        return res
          .status(500)
          .json({ error: "Database error: " + error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Coupon not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Supabase coupon update error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Delete coupon code
router.delete(
  "/:id",
  authenticateToken,
  validateParams(couponIdSchema),
  async (req, res) => {
    const id = req.params.id;

    try {
      // 1) Delete wheel relationships first
      const { error: wcErr } = await supabase
        .from('wheel_coupons')
        .delete()
        .eq('coupon_id', id);
      
      if (wcErr) {
        console.error("❌ Error deleting wheel_coupons:", wcErr);
        return res.status(500).json({ 
          error: "Database error: " + wcErr.message 
        });
      }

      // 2) Delete redemptions
      const { error: redErr } = await supabase
        .from('coupon_redemptions')
        .delete()
        .eq('coupon_id', id);
      
      if (redErr) {
        console.error("❌ Error deleting coupon_redemptions:", redErr);
        return res.status(500).json({ 
          error: "Database error: " + redErr.message 
        });
      }

      // 3) Delete the coupon
      const { error } = await supabase
        .from("coupon_codes")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("❌ Supabase coupon deletion error:", error);
        return res
          .status(500)
          .json({ error: "Database error: " + error.message });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Supabase coupon deletion error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

router.get("/lookup/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const phoneNumber = req.query.phone; // Get phone number from query parameter

  try {
    // First, check if it's a main coupon code (for price calculator)
    const { data: mainCoupon, error: mainError } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (!mainError && mainCoupon) {
      // Check if coupon has expired
      if (mainCoupon.expires_at) {
        const now = new Date();
        const expiryDate = new Date(mainCoupon.expires_at);
        if (now > expiryDate) {
          return res.json({ valid: false, message: "coupons.expired" });
        }
      }

      return res.json({
        valid: true,
        type: "main_coupon",
        discount_percentage: mainCoupon.discount_percentage,
        free_days: mainCoupon.free_days,
        description: mainCoupon.description,
        coupon_id: mainCoupon.id,
      });
    }

    // If not a main coupon, check if it's a redemption code
    const { data: redemption, error: redemptionError } = await supabase
      .from("coupon_redemptions")
      .select(
        `
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
      `
      )
      .eq("redemption_code", code)
      .single();

    if (redemptionError || !redemption) {
      return res.json({ valid: false, message: "coupons.invalid_code" });
    }

    const coupon = redemption.coupon_codes;

    // Check if the parent coupon is active and not expired
    if (!coupon.is_active) {
      return res.json({ valid: false, message: "coupons.invalid_code" });
    }

    if (coupon.expires_at) {
      const now = new Date();
      const expiryDate = new Date(coupon.expires_at);
      if (now > expiryDate) {
        return res.json({ valid: false, message: "coupons.expired" });
      }
    }

    // Check redemption code status
    // Check redemption code status
    if (redemption.status === "redeemed") {
      return res.json({ valid: false, message: "coupons.already_used" });
    }

    // Accept both 'available' and 'showed' statuses as valid
    if (redemption.status !== "available" && redemption.status !== "showed") {
      return res.json({ valid: false, message: "coupons.invalid_code" });
    }

    // If phone number is provided, validate it
    if (phoneNumber) {
      try {
        const { getPhoneNumberData } = require("../lib/phoneNumberTracker");
        const phoneData = await getPhoneNumberData(phoneNumber);

        if (!phoneData) {
          return res.json({
            valid: false,
            message: "coupons.phone_not_authorized",
          });
        }

        // Check if the redemption code is available for this phone number
        const availableCoupons = phoneData.available_coupons || [];
        if (!availableCoupons.includes(code)) {
          return res.json({
            valid: false,
            message: "coupons.not_available_for_phone",
          });
        }

        // Check if the code has already been redeemed by this phone number
        const redeemedCoupons = phoneData.redeemed_coupons || [];
        if (redeemedCoupons.includes(code)) {
          return res.json({
            valid: false,
            message: "coupons.already_used_with_phone",
          });
        }
      } catch (phoneError) {
        console.error("❌ Error validating phone number:", phoneError);
        return res.json({
          valid: false,
          message: "coupons.phone_not_authorized",
        });
      }
    }

    // Code is valid and showed
    res.json({
      valid: true,
      type: "redemption_code",
      discount_percentage: coupon.discount_percentage,
      free_days: coupon.free_days,
      description: coupon.description,
      coupon_id: coupon.id,
      redemption_code: code,
      redemption_id: redemption.id,
    });
  } catch (error) {
    console.error("❌ Supabase error in lookup:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Validate redemption code with phone number (individual codes from available_codes array)
router.get("/validate-redemption/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const phoneNumber = req.query.phone; // Get phone number from query parameter

  try {
    // Get all active coupons and check their available_codes
    const { data, error } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("❌ Supabase error fetching coupons:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    // Check if coupon has expired
    const now = new Date();
    let validCoupon = null;

    for (const coupon of data) {
      if (coupon.expires_at) {
        const expiryDate = new Date(coupon.expires_at);
        if (now > expiryDate) {
          continue; // Skip expired coupons
        }
      }

      // Parse available_codes array
      let availableCodes = [];
      let showedCodes = [];
      try {
        availableCodes = coupon.available_codes
          ? JSON.parse(coupon.available_codes)
          : [];
        showedCodes = coupon.showed_codes
          ? JSON.parse(coupon.showed_codes)
          : [];
      } catch (parseError) {
        console.error("Error parsing codes:", parseError);
        continue;
      }

      // Check if the code exists in available_codes or showed_codes
      if (availableCodes.includes(code) || showedCodes.includes(code)) {
        validCoupon = coupon;
        break;
      }
    }

    if (!validCoupon) {
      return res.json({ valid: false, message: "coupons.invalid_code" });
    }

    // If phone number is provided, validate it against the phone_numbers table
    if (phoneNumber) {
      try {
        const { getPhoneNumberData } = require("../lib/phoneNumberTracker");
        const phoneData = await getPhoneNumberData(phoneNumber);

        if (!phoneData) {
          return res.json({
            valid: false,
            message: "coupons.phone_not_authorized",
          });
        }

        // Check if the redemption code is available for this phone number
        const availableCoupons = phoneData.available_coupons || [];
        if (!availableCoupons.includes(code)) {
          return res.json({
            valid: false,
            message: "coupons.not_available_for_phone",
          });
        }

        // Check if the code has already been redeemed by this phone number
        const redeemedCoupons = phoneData.redeemed_coupons || [];
        if (redeemedCoupons.includes(code)) {
          return res.json({
            valid: false,
            message: "coupons.already_used_with_phone",
          });
        }
      } catch (phoneError) {
        console.error("❌ Error validating phone number:", phoneError);
        return res.json({
          valid: false,
          message: "coupons.phone_not_authorized",
        });
      }
    }

    res.json({
      valid: true,
      type: validCoupon.type,
      discount_percentage: validCoupon.discount_percentage,
      free_days: validCoupon.free_days,
      description: validCoupon.description,
      coupon_id: validCoupon.id,
      redemption_code: code,
    });
  } catch (error) {
    console.error("❌ Supabase error validating redemption code:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Validate coupon code (for price calculator)
router.get("/validate/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();

  try {
    const { data, error } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return res.json({ valid: false, message: "coupons.invalid_code" });
    }

    // Check if coupon has expired
    if (data.expires_at) {
      const now = new Date();
      const expiryDate = new Date(data.expires_at);
      if (now > expiryDate) {
        return res.json({ valid: false, message: "coupons.expired" });
      }
    }

    res.json({
      valid: true,
      discount_percentage: data.discount_percentage,
      description: data.description,
    });
  } catch (error) {
    console.error("❌ Supabase error validating coupon:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Mark redemption code as used (move from available_codes to showed_codes)
router.post(
  "/use-redemption-code",
  validate(couponUseSchema),
  async (req, res) => {
    const { coupon_id, redemption_code, customer_phone } = req.body;

    if (!coupon_id || !redemption_code) {
      return res
        .status(400)
        .json({ error: "Coupon ID and redemption code are required" });
    }

    try {
      // Get the coupon
      const { data: coupon, error: fetchError } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("id", coupon_id)
        .single();

      if (fetchError || !coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }

      // Parse available_codes and showed_codes
      let availableCodes = [];
      let showedCodes = [];
      try {
        availableCodes = coupon.available_codes
          ? JSON.parse(coupon.available_codes)
          : [];
        showedCodes = coupon.showed_codes
          ? JSON.parse(coupon.showed_codes)
          : [];
      } catch (parseError) {
        console.error("Error parsing codes arrays:", parseError);
        return res.status(500).json({ error: "Invalid code format" });
      }

      // Check if code exists in showed_codes (not available_codes)
      if (!showedCodes.includes(redemption_code)) {
        return res
          .status(400)
          .json({ error: "Redemption code not found or already used" });
      }

      // DON'T move codes - they're already in showed_codes
      // Just add to phone_numbers.redeemed_coupons
      if (customer_phone) {
        const { addRedeemedCoupon } = require("../lib/phoneNumberTracker");
        const result = await addRedeemedCoupon(customer_phone, redemption_code);

        if (!result.success) {
          console.error("Failed to add redeemed coupon:", result.error);
          return res
            .status(500)
            .json({ error: "Failed to track redeemed coupon" });
        }
      }

      res.json({ success: true, message: "Redemption code used successfully" });
    } catch (error) {
      console.error("❌ Supabase error using redemption code:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

module.exports = router;
