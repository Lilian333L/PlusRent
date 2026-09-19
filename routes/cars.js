const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const TelegramNotifier = require("../config/telegram");

const {
  supabase,
  supabaseAdmin,
  uploadCarImage,
  getCarImageUrl,
} = require("../lib/supabaseClient");

// Import validation middleware and schemas
const {
  validate,
  validateParams,
  carCreateSchema,
  carUpdateSchema,
  carIdSchema,
  carReorderSchema,
} = require("../middleware/validation");

// Import authentication middleware
const { authenticateToken } = require("../middleware/auth");

// Function to check if a car is currently unavailable and when it will be available
async function getNextAvailableDate(carId) {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Compare dates only

    // Get all CONFIRMED bookings for this car (only confirmed bookings make car unavailable)
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("pickup_date, return_date")
      .eq("car_id", carId)
      .eq("status", "confirmed");

    if (error) {
      console.error("Error fetching bookings for availability check:", error);
      return null;
    }

    if (!bookings || bookings.length === 0) {
      return null; // Available now
    }

    // Check if car is currently being used (between pickup and return dates)
    const currentBookings = bookings.filter((booking) => {
      const pickupDate = new Date(booking.pickup_date);
      const returnDate = new Date(booking.return_date);
      pickupDate.setHours(0, 0, 0, 0);
      returnDate.setHours(0, 0, 0, 0);

      // Car is currently being used if current date is between pickup and return dates
      return currentDate >= pickupDate && currentDate <= returnDate;
    });

    if (currentBookings.length > 0) {
      // Car is currently being used, find the latest return date
      const latestReturnDate = new Date(
        Math.max(...currentBookings.map((b) => new Date(b.return_date)))
      );
      latestReturnDate.setHours(0, 0, 0, 0);

      // Add one day to get the next available date
      const nextAvailable = new Date(latestReturnDate);
      nextAvailable.setDate(nextAvailable.getDate() + 1);

      return nextAvailable;
    }

    // Check for future bookings (pickup date is in the future)
    const futureBookings = bookings.filter((booking) => {
      const pickupDate = new Date(booking.pickup_date);
      pickupDate.setHours(0, 0, 0, 0);

      // Future booking if pickup date is after current date
      return pickupDate > currentDate;
    });

    if (futureBookings.length > 0) {
      // Car has future bookings, find the earliest pickup date
      const earliestPickupDate = new Date(
        Math.min(...futureBookings.map((b) => new Date(b.pickup_date)))
      );
      earliestPickupDate.setHours(0, 0, 0, 0);

      // Car is unavailable until the earliest pickup date
      return earliestPickupDate;
    }

    // No current or future bookings, car is available
    return null;
  } catch (error) {
    console.error("Error in getNextAvailableDate:", error);
    return null;
  }
}

// Use memory storage for Vercel (files will be uploaded to Supabase Storage)
const memoryStorage = multer.memoryStorage();

// Check if running on Vercel
const isVercel =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// Multer storage config - use memory storage for Vercel, disk storage for local dev
const tempImageStorage = isVercel
  ? memoryStorage
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const tempDir = path.join(__dirname, "..", "uploads", "temp");
        fs.mkdirSync(tempDir, { recursive: true });
        cb(null, tempDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        const base =
          file.fieldname === "head_image" ? "head" : `gallery_${timestamp}`;
        cb(null, base + ext);
      },
    });

// Multer storage config for car images (with car ID)
const carImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const carId = req.params.id;
    const dir = path.join(__dirname, "..", "uploads", `car-${carId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base =
      file.fieldname === "head_image" ? "head" : `gallery_${Date.now()}`;
    cb(null, base + ext);
  },
});

// Simple multer config for parsing FormData (no file storage)
const formDataUpload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024, // 50MB limit for fields
  },
});

const upload = multer({
  storage: carImageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024, // 50MB limit for fields
  },
});
const tempUpload = multer({
  storage: tempImageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024, // 50MB limit for fields
  },
});

/**
 * Which car of a duplicate group is the one search engines are pointed at.
 *
 * Several cars can be the same make, model and year. Only one of them gets an
 * indexable page, and by default that is whichever was added first. The owner
 * may want a different one, for instance after deleting the first, so the
 * choice is stored as a map of "make|model|year" to a car id. It lives in
 * global_settings rather than on the car itself, so it survives the chosen car
 * being deleted and needs no change to the cars table.
 *
 * Declared before router.get("/:id"), which would otherwise treat
 * "seo-primary" as a car id.
 */
const SEO_PRIMARY_KEY = "seo_primary_cars";

async function readSeoPrimary() {
  const { data, error } = await supabase
    .from("global_settings")
    .select("setting_value")
    .eq("setting_key", SEO_PRIMARY_KEY)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (!data || !data.setting_value) return {};
  try {
    const parsed = JSON.parse(data.setting_value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

router.get("/seo-primary", async (req, res) => {
  try {
    res.json({ success: true, overrides: await readSeoPrimary() });
  } catch (error) {
    res.status(500).json({ error: "Failed to read: " + error.message });
  }
});

router.post("/seo-primary", authenticateToken, async (req, res) => {
  const { group_key, car_id } = req.body || {};
  if (!group_key || typeof group_key !== "string") {
    return res.status(400).json({ error: "group_key is required" });
  }
  try {
    const overrides = await readSeoPrimary();
    if (car_id === null || car_id === "" || car_id === undefined) {
      delete overrides[group_key]; // back to the default, the first one added
    } else {
      overrides[group_key] = String(car_id);
    }
    const value = JSON.stringify(overrides);
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("global_settings")
      .update({ setting_value: value, updated_at: now })
      .eq("setting_key", SEO_PRIMARY_KEY)
      .select();
    if (updateError && updateError.code !== "PGRST116") throw updateError;

    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("global_settings")
        .insert({ setting_key: SEO_PRIMARY_KEY, setting_value: value, updated_at: now });
      if (insertError) throw insertError;
    }
    res.json({ success: true, overrides });
  } catch (error) {
    res.status(500).json({ error: "Failed to save: " + error.message });
  }
});

// Get all cars with filtering
router.get("/", async (req, res) => {
  // Use native Supabase client for filtering
  try {
    let query = supabase.from("cars").select("*");

    // Helper to add filters
    function addFilter(field, param) {
      if (req.query[param] && req.query[param] !== "") {
        const values = req.query[param]
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        if (values.length > 1) {
          // Multiple values - use 'in' operator
          query = query.in(field, values);
        } else {
          // Single value - use 'eq' operator
          query = query.eq(field, values[0]);
        }
      }
    }

    // Add filters
    addFilter("make_name", "make_name");
    addFilter("model_name", "model_name");
    addFilter("gear_type", "gear_type");
    addFilter("fuel_type", "fuel_type");
    addFilter("car_type", "car_type");
    addFilter("num_doors", "num_doors");
    addFilter("num_passengers", "num_passengers");

    // Year filters
    if (req.query.min_year && req.query.min_year !== "") {
      query = query.gte("production_year", req.query.min_year);
    }
    if (req.query.max_year && req.query.max_year !== "") {
      query = query.lte("production_year", req.query.max_year);
    }

    // NOTE: Supabase does not have a daily_rate column. We'll filter by price in-memory
    // based on price_policy['1-2'] after fetching results.

    // Order by display_order first, then by id for consistency
    query = query
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase query error:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }

    // Parse price_policy and gallery_images for each car
    const cars = data.map((car) => {
      // Parse price_policy if it's a string
      if (car.price_policy && typeof car.price_policy === "string") {
        try {
          car.price_policy = JSON.parse(car.price_policy);
        } catch (e) {
          console.warn("Failed to parse price_policy for car:", car.id);
        }
      }

      // Parse gallery_images if it's a string
      if (car.gallery_images && typeof car.gallery_images === "string") {
        try {
          car.gallery_images = JSON.parse(car.gallery_images);
        } catch (e) {
          console.warn("Failed to parse gallery_images for car:", car.id);
        }
      }

      return car;
    });

    // Calculate availability for each car dynamically
    const carsWithAvailability = await Promise.all(
      cars.map(async (car) => {
        try {
          const nextAvailableDate = await getNextAvailableDate(car.id);
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Compare dates only

          if (nextAvailableDate) {
            // Car is unavailable
            car.booked = true;
            car.booked_until = nextAvailableDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
          } else {
            // Car is available
            car.booked = false;
            car.booked_until = null;
          }
        } catch (error) {
          console.error(
            `Error calculating availability for car ${car.id}:`,
            error
          );
          // Default to available if there's an error
          car.booked = false;
          car.booked_until = null;
        }

        return car;
      })
    );

    // In-memory price filtering based on price_policy['1-2']
    const minPrice =
      req.query.min_price && req.query.min_price !== ""
        ? parseFloat(req.query.min_price)
        : null;
    const maxPrice =
      req.query.max_price && req.query.max_price !== ""
        ? parseFloat(req.query.max_price)
        : null;
    let filteredCars = carsWithAvailability;
    if (minPrice !== null || maxPrice !== null) {
      filteredCars = carsWithAvailability.filter((car) => {
        const pp = car.price_policy || {};
        const rateRaw = pp["1-2"];
        const rate =
          rateRaw !== undefined && rateRaw !== null ? parseFloat(rateRaw) : NaN;
        if (Number.isNaN(rate)) return false;
        if (minPrice !== null && rate < minPrice) return false;
        if (maxPrice !== null && rate > maxPrice) return false;
        return true;
      });
    }

    res.json(filteredCars);
  } catch (error) {
    console.error("❌ Supabase error fetching cars:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Get cars for booking form (only available cars with basic info)
router.get("/booking/available", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("cars")
      .select(
        "id, make_name, model_name, production_year, head_image, price_policy, booked, car_type, num_doors, num_passengers, fuel_type, gear_type"
      )
      .or("booked.eq.0,booked.is.null")
      .order("make_name", { ascending: true })
      .order("model_name", { ascending: true });

    if (error) {
      console.error("❌ Supabase error fetching available cars:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    // Parse price_policy for each car and format for display
    const cars = data.map((car) => {
      // Supabase already returns parsed JSON, so only parse if it's a string
      const pricePolicy =
        typeof car.price_policy === "string"
          ? car.price_policy
            ? JSON.parse(car.price_policy)
            : {}
          : car.price_policy || {};
      const dailyPrice = pricePolicy["1-2"] || "N/A";

      return {
        id: car.id,
        make_name: car.make_name,
        model_name: car.model_name,
        production_year: car.production_year,
        head_image: car.head_image,
        daily_price: dailyPrice,
        price_policy: pricePolicy, // Include the full price policy
        car_type: car.car_type,
        num_doors: car.num_doors,
        num_passengers: car.num_passengers,
        fuel_type: car.fuel_type,
        gear_type: car.gear_type,
        display_name: `${car.make_name} ${car.model_name} - $${dailyPrice}`,
        // For backward compatibility with existing select options
        value: `${car.make_name} ${car.model_name}`,
        data_src: car.head_image
          ? car.head_image.startsWith("http")
            ? car.head_image
            : `${req.protocol}://${req.get("host")}${car.head_image}`
          : `images/cars-alt/${car.make_name.toLowerCase()}-${car.model_name
              .toLowerCase()
              .replace(/\s+/g, "-")}.png`,
      };
    });

    res.json(cars);
  } catch (error) {
    console.error("❌ Supabase error fetching available cars:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Get single car by ID
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Supabase error fetching car:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Car not found" });
    }

    // Parse JSON fields if they're strings
    if (typeof data.price_policy === "string") {
      data.price_policy = data.price_policy
        ? JSON.parse(data.price_policy)
        : {};
    }
    if (typeof data.gallery_images === "string") {
      data.gallery_images = data.gallery_images
        ? JSON.parse(data.gallery_images)
        : [];
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Supabase error fetching car:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Add new car (Admin only)
router.post(
  "/",
  authenticateToken,
  validate(carCreateSchema),
  async (req, res) => {
    // Handle base64 image uploads for Supabase Storage
    let headImageUrl = null;
    let galleryImageUrls = [];

    // Process head image if provided
    if (req.body.head_image && req.body.head_image.data) {
      try {
        // Delete old head image if it exists
        if (car.head_image) {
          try {
            // Extract filename from the URL to delete the old file
            const oldImagePath = car.head_image.split('/').pop();
            if (oldImagePath) {
              await deleteCarImage(carId, oldImagePath);
            }
          } catch (deleteError) {
            console.error("❌ Error deleting old head image:", deleteError);
            // Continue with upload even if deletion fails
          }
        }
    
        const headImageData = req.body.head_image;
        const imageBuffer = Buffer.from(headImageData.data, "base64");
        const headFile = {
          buffer: imageBuffer,
          mimetype: `image/${headImageData.extension || "jpeg"}`,
          originalname: `head.${headImageData.extension || "jpg"}`,
        };
    
        // Upload new head image
        headImagePath = await uploadCarImage(headFile, carId, "head");
      } catch (error) {
        console.error("❌ Error uploading head image to Supabase:", error);
      }
    } else if (req.body.head_image === null || req.body.head_image === '') {
      // Handle explicit image removal
      if (car.head_image) {
        try {
          const oldImagePath = car.head_image.split('/').pop();
          if (oldImagePath) {
            await deleteCarImage(carId, oldImagePath);
          }
        } catch (deleteError) {
          console.error("❌ Error deleting head image:", deleteError);
        }
      }
      headImagePath = null;
    }

    const {
      make_name,
      model_name,
      production_year,
      gear_type,
      fuel_type,
      engine_capacity,
      car_type,
      num_doors,
      num_passengers,
      price_policy: pricePolicyRaw,
      booked_until,
      luggage,
      mileage,
      drive,
      fuel_economy,
      exterior_color,
      interior_color,
      rca_insurance_price,
      casco_insurance_price,
      likes,
      description_en,
      description_ro,
      description_ru,
    } = req.body;

    // Parse price_policy if it's a JSON string
    let price_policy;
    try {
      price_policy =
        typeof pricePolicyRaw === "string"
          ? JSON.parse(pricePolicyRaw)
          : pricePolicyRaw;
    } catch (error) {
      console.error("Error parsing price_policy:", error);
      price_policy = {};
    }

    // For electric cars, engine_capacity can be null
    const isElectric = fuel_type === "Electric";

    // Check all required fields that match frontend validation
    const requiredFields = {
      make_name: "Make Name",
      model_name: "Model Name",
      production_year: "Production Year",
      gear_type: "Gear Type",
      fuel_type: "Fuel Type",
      car_type: "Car Type",
      num_doors: "Number of Doors",
      num_passengers: "Number of Passengers",
    };

    // Check price policy fields
    const requiredPriceFields = {
      "1-2": "Price 1-2 days",
      "3-7": "Price 3-7 days",
      "8-20": "Price 8-20 days",
      "21-45": "Price 21-45 days",
      "46+": "Price 46+ days",
    };

    const missingFields = [];

    // Check basic required fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field].toString().trim() === "") {
        missingFields.push(label);
      }
    }

    // Check price policy fields
    if (!price_policy) {
      missingFields.push("Price Policy");
    } else {
      for (const [key, label] of Object.entries(requiredPriceFields)) {
        if (!price_policy[key] || price_policy[key].toString().trim() === "") {
          missingFields.push(label);
        }
      }
    }

    // Check engine capacity for non-electric cars
    if (
      !isElectric &&
      (!engine_capacity || engine_capacity.toString().trim() === "")
    ) {
      missingFields.push("Engine Capacity");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missingFields: missingFields,
      });
    }

    let engineCapacityValue = null;

    // Only validate and convert engine_capacity for non-electric cars
    if (!isElectric) {
      // Parse engine_capacity as a float to support decimal values
      engineCapacityValue = parseFloat(engine_capacity);
      if (isNaN(engineCapacityValue) || engineCapacityValue <= 0) {
        return res
          .status(400)
          .json({ error: "Engine capacity must be a positive number" });
      }
    }

    // Convert all price_policy values to strings and ensure keys are properly formatted
    const pricePolicyStringified = {};
    for (const key in price_policy) {
      // Ensure the key is properly formatted for JSON
      const formattedKey = key.replace(/^(\d+)-(\d+)$/, "$1-$2");
      pricePolicyStringified[formattedKey] = String(price_policy[key]);
    }

    // Parse optional numeric fields
    const mileageValue = mileage ? parseInt(mileage) : null;
    const fuelEconomyValue = fuel_economy ? parseFloat(fuel_economy) : null;
    const rcaInsuranceValue = rca_insurance_price
      ? parseFloat(rca_insurance_price)
      : null;
    const cascoInsuranceValue = casco_insurance_price
      ? parseFloat(casco_insurance_price)
      : null;
    const likesValue = likes ? parseInt(likes) : 0;

    // Create multilingual description object
    const descriptionObj = {};
    if (description_en) descriptionObj.en = description_en;
    if (description_ro) descriptionObj.ro = description_ro;
    if (description_ru) descriptionObj.ru = description_ru;
    const descriptionJson = JSON.stringify(descriptionObj);

    // Store in DB, booked defaults to 0

    try {
      // Prepare car data for Supabase
      const carData = {
        make_name,
        model_name,
        production_year: parseInt(production_year),
        gear_type,
        fuel_type,
        engine_capacity: engineCapacityValue,
        car_type,
        num_doors: parseInt(num_doors),
        num_passengers: parseInt(num_passengers),
        price_policy: JSON.stringify(pricePolicyStringified),
        booked: 0,
        booked_until: booked_until || null,
        luggage: luggage || null,
        mileage: mileageValue,
        drive: drive || null,
        fuel_economy: fuelEconomyValue,
        exterior_color: exterior_color || null,
        interior_color: interior_color || null,
        rca_insurance_price: rcaInsuranceValue,
        casco_insurance_price: cascoInsuranceValue,
        likes: likesValue,
        description: descriptionJson,
        head_image: null, // Will be updated after image upload
        gallery_images: JSON.stringify([]), // Will be updated after image upload
        is_premium: false,
        display_order: 0,
        status: "active",
      };

      // Remove null/undefined values to avoid Supabase errors
      Object.keys(carData).forEach((key) => {
        if (carData[key] === null || carData[key] === undefined) {
          delete carData[key];
        }
      });

      const { data, error } = await supabase
        .from("cars")
        .insert(carData)
        .select();

      if (error) {
        console.error("❌ Supabase car creation error:", error);
        return res
          .status(500)
          .json({ error: "Database error: " + error.message });
      }

      const carId = data[0].id;
      console.log("✅ Car created successfully with ID:", carId);

      // Process images from request body
      let finalHeadImageUrl = null;
      let finalGalleryImageUrls = [];

      // Process head image if provided
      if (req.body.head_image && req.body.head_image.data) {
        console.log("🔄 Processing head image for car ID:", carId);
        try {
          const headImageData = req.body.head_image;
          const imageBuffer = Buffer.from(headImageData.data, "base64");
          const headFile = {
            buffer: imageBuffer,
            mimetype: `image/${headImageData.extension || "jpeg"}`,
            originalname: `head.${headImageData.extension || "jpg"}`,
          };
          
          finalHeadImageUrl = await uploadCarImage(headFile, carId, "head");
          console.log("✅ Head image uploaded successfully:", finalHeadImageUrl);
        } catch (error) {
          console.error("❌ Error uploading head image to Supabase:", error);
        }
      }

      // Process gallery images if provided
      const galleryUploadErrors = [];
      if (req.body.gallery_images && Array.isArray(req.body.gallery_images)) {
        console.log("🔄 Processing gallery images for car ID:", carId);
        console.log("📸 Number of gallery images:", req.body.gallery_images.length);
        
        for (let index = 0; index < req.body.gallery_images.length; index++) {
          const imageData = req.body.gallery_images[index];
          if (imageData && imageData.data) {
            try {
              const imageBuffer = Buffer.from(imageData.data, "base64");
              const galleryFile = {
                buffer: imageBuffer,
                mimetype: `image/${imageData.extension || "jpeg"}`,
                originalname: `gallery_${Date.now()}_${index}.${imageData.extension || "jpg"}`,
              };
              
              const galleryImageUrl = await uploadCarImage(galleryFile, carId, "gallery");
              finalGalleryImageUrls.push(galleryImageUrl);
              console.log(`✅ Gallery image ${index + 1} uploaded successfully:`, galleryImageUrl);
            } catch (error) {
              console.error(`❌ Error uploading gallery image ${index + 1} to Supabase:`, error);
              galleryUploadErrors.push({ index, message: error.message || String(error) });
            }
          }
        }
      }

      // Update car with image URLs if any images were uploaded
      if (finalHeadImageUrl || finalGalleryImageUrls.length > 0) {
        console.log("🔄 Updating car with image URLs:");
        console.log("📸 Head image URL:", finalHeadImageUrl);
        console.log("📸 Gallery image URLs:", finalGalleryImageUrls);
        
        const imageUpdateData = {};
        if (finalHeadImageUrl) imageUpdateData.head_image = finalHeadImageUrl;
        if (finalGalleryImageUrls.length > 0) imageUpdateData.gallery_images = JSON.stringify(finalGalleryImageUrls);
        
        const { error: updateError } = await supabase
          .from("cars")
          .update(imageUpdateData)
          .eq("id", carId);
          
        if (updateError) {
          console.error("❌ Error updating car with image URLs:", updateError);
        } else {
          console.log("✅ Car updated with image URLs successfully");
        }
      }


      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const telegramCarData = {
          make_name,
          model_name,
          production_year,
          gear_type,
          fuel_type,
          car_type,
          num_doors,
          num_passengers,
          price_policy: pricePolicyStringified,
          rca_insurance_price: rcaInsuranceValue,
          casco_insurance_price: cascoInsuranceValue,
        };
        await telegram.sendMessage(
          telegram.formatCarAddedMessage(telegramCarData)
        );
      } catch (error) {
        console.error("Error sending Telegram notification:", error);
      }

      res.json({
        success: true,
        id: carId,
        ...(galleryUploadErrors.length > 0
          ? {
              gallery_upload_errors: galleryUploadErrors,
              warning: `${galleryUploadErrors.length} of ${req.body.gallery_images?.length || 0} gallery image(s) failed to upload`,
            }
          : {}),
      });
    } catch (error) {
      console.error("❌ Supabase car creation error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Update car (Admin only)
router.put(
  "/:id",
  authenticateToken,
  validateParams(carIdSchema),
  validate(carUpdateSchema),
  async (req, res) => {
    const id = req.params.id;
    const {
      make_name,
      model_name,
      production_year,
      gear_type,
      fuel_type,
      engine_capacity,
      car_type,
      num_doors,
      num_passengers,
      price_policy: rawPricePolicy,
      booked,
      booked_until,
      gallery_images,
      gallery_images_order,
      luggage,
      mileage,
      drive,
      fuel_economy,
      exterior_color,
      interior_color,
      rca_insurance_price,
      casco_insurance_price,
      likes,
      description_en,
      description_ro,
      description_ru,
    } = req.body;

    // Parse price_policy if it comes as a JSON string (from FormData)
    let price_policy;
    try {
      price_policy =
        typeof rawPricePolicy === "string"
          ? JSON.parse(rawPricePolicy)
          : rawPricePolicy;
    } catch (error) {
      console.error("Error parsing price_policy:", error);
      return res.status(400).json({ error: "Invalid price_policy format" });
    }

    // For electric cars, engine_capacity can be null
    const isElectric = fuel_type === "Electric";

    // Check all required fields that match frontend validation
    const requiredFields = {
      make_name: "Make Name",
      model_name: "Model Name",
      production_year: "Production Year",
      gear_type: "Gear Type",
      fuel_type: "Fuel Type",
      car_type: "Car Type",
      num_doors: "Number of Doors",
      num_passengers: "Number of Passengers",
    };

    // Check price policy fields
    const requiredPriceFields = {
      "1-2": "Price 1-2 days",
      "3-7": "Price 3-7 days",
      "8-20": "Price 8-20 days",
      "21-45": "Price 21-45 days",
      "46+": "Price 46+ days",
    };

    const missingFields = [];

    // Check basic required fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field].toString().trim() === "") {
        missingFields.push(label);
      }
    }

    // Check price policy fields
    if (!price_policy) {
      missingFields.push("Price Policy");
    } else {
      for (const [key, label] of Object.entries(requiredPriceFields)) {
        if (!price_policy[key] || price_policy[key].toString().trim() === "") {
          missingFields.push(label);
        }
      }
    }

    // Check engine capacity for non-electric cars
    if (
      !isElectric &&
      (!engine_capacity || engine_capacity.toString().trim() === "")
    ) {
      missingFields.push("Engine Capacity");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missingFields: missingFields,
      });
    }

    let engineCapacityValue = null;

    // Only validate and convert engine_capacity for non-electric cars
    if (
      !isElectric &&
      engine_capacity !== undefined &&
      engine_capacity !== ""
    ) {
      // Parse engine_capacity as a float to support decimal values
      engineCapacityValue = parseFloat(engine_capacity);
      if (isNaN(engineCapacityValue) || engineCapacityValue <= 0) {
        return res
          .status(400)
          .json({ error: "Engine capacity must be a positive number" });
      }
    }

    const pricePolicyStringified = {};
    for (const key in price_policy) {
      pricePolicyStringified[key] = String(price_policy[key]);
    }

    // Parse optional numeric fields
    const mileageValue = mileage ? parseInt(mileage) : null;
    const fuelEconomyValue = fuel_economy ? parseFloat(fuel_economy) : null;
    const rcaInsuranceValue = rca_insurance_price
      ? parseFloat(rca_insurance_price)
      : null;
    const cascoInsuranceValue = casco_insurance_price
      ? parseFloat(casco_insurance_price)
      : null;
    const likesValue = likes ? parseInt(likes) : 0;

    // Create multilingual description object
    const descriptionObj = {};
    if (description_en) descriptionObj.en = description_en;
    if (description_ro) descriptionObj.ro = description_ro;
    if (description_ru) descriptionObj.ru = description_ru;
    const descriptionJson = JSON.stringify(descriptionObj);

    // Calculate booked status based on booked_until date
    let bookedStatus = 0;
    if (booked_until) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const bookedUntilDate = new Date(booked_until);
      bookedUntilDate.setHours(0, 0, 0, 0);

      // If current date is before or equal to booked_until date, car is booked
      if (currentDate <= bookedUntilDate) {
        bookedStatus = 1;
      }
    }

    try {
      // Prepare update data for Supabase
      const updateData = {
        make_name,
        model_name,
        production_year: parseInt(production_year),
        gear_type,
        fuel_type,
        engine_capacity: engineCapacityValue,
        car_type,
        num_doors: parseInt(num_doors),
        num_passengers: parseInt(num_passengers),
        price_policy: JSON.stringify(pricePolicyStringified),
        booked: bookedStatus,
        booked_until: booked_until || null,
        luggage: luggage || null,
        mileage: mileageValue,
        drive: drive || null,
        fuel_economy: fuelEconomyValue,
        exterior_color: exterior_color || null,
        interior_color: interior_color || null,
        rca_insurance_price: rcaInsuranceValue,
        casco_insurance_price: cascoInsuranceValue,
        likes: likesValue,
        description: descriptionJson,
      };

      // The admin can drag the gallery into a different order; when that list
      // arrives, it is the order the car keeps.
      if (Array.isArray(gallery_images_order)) {
        updateData.gallery_images = JSON.stringify(gallery_images_order);
      }


      // Remove null/undefined values to avoid Supabase errors
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from("cars")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) {
        console.error("❌ Supabase car update error:", error);
        return res
          .status(500)
          .json({ error: "Database error: " + error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Car not found" });
      }

      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const carData = {
          make_name,
          model_name,
          production_year,
          gear_type,
          fuel_type,
          car_type,
          num_doors,
          num_passengers,
          price_policy: pricePolicyStringified,
          rca_insurance_price: rcaInsuranceValue,
          casco_insurance_price: cascoInsuranceValue,
        };
        await telegram.sendMessage(telegram.formatCarUpdatedMessage(carData));
      } catch (error) {
        console.error("Error sending Telegram notification:", error);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Supabase car update error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Delete car (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  validateParams(carIdSchema),
  async (req, res) => {
    const id = req.params.id;

    try {
      // Сначала проверяем, есть ли бронирования для этой машины
      const { data: bookingsCheck, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("car_id", id);

      if (bookingsError) {
        console.error("❌ Ошибка проверки бронирований:", bookingsError);
        return res
          .status(500)
          .json({ error: "Ошибка базы данных: " + bookingsError.message });
      }

      // Если есть активные бронирования, запрещаем удаление
      const activeBookings = bookingsCheck?.filter(b => 
        b.status === 'confirmed' || b.status === 'pending'
      ) || [];

      if (activeBookings.length > 0) {
        return res.status(400).json({ 
          error: "Невозможно удалить машину с активными бронированиями",
          activeBookingsCount: activeBookings.length,
          suggestion: "Сначала отмените или завершите все активные бронирования"
        });
      }

      // Получаем данные машины
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

      if (carError) {
        console.error("❌ Ошибка получения данных машины:", carError);
        return res
          .status(500)
          .json({ error: "Ошибка базы данных: " + carError.message });
      }

      if (!carData) {
        return res.status(404).json({ error: "Машина не найдена" });
      }

      // ВАРИАНТ 1: Удаляем все бронирования связанные с этой машиной
      if (bookingsCheck && bookingsCheck.length > 0) {
        console.log(`🗑️ Удаление ${bookingsCheck.length} бронирований для машины ID ${id}`);
        
        const { error: deleteBookingsError } = await supabase
          .from("bookings")
          .delete()
          .eq("car_id", id);

        if (deleteBookingsError) {
          console.error("❌ Ошибка удаления бронирований:", deleteBookingsError);
          return res
            .status(500)
            .json({ error: "Не удалось удалить связанные бронирования: " + deleteBookingsError.message });
        }
        console.log(`✅ Удалено ${bookingsCheck.length} бронирований`);
      }

      // Удаляем запись из booked_cars если есть
      const { error: bookedCarsError } = await supabase
        .from("booked_cars")
        .delete()
        .eq("car_id", id);

      if (bookedCarsError) {
        console.log("⚠️ Предупреждение при удалении из booked_cars:", bookedCarsError.message);
        // Не останавливаем процесс, это не критично
      }

      // Удаляем изображения из Supabase Storage
      try {
        // Удаляем главное изображение
        if (carData.head_image) {
          const headImagePath = carData.head_image.split('/').pop();
          if (headImagePath) {
            const { error: headDeleteError } = await supabaseAdmin.storage
              .from('car-images')
              .remove([`car-${id}/${headImagePath}`]);
            
            if (headDeleteError) {
              console.log("⚠️ Не удалось удалить главное изображение:", headDeleteError.message);
            } else {
              console.log("✅ Удалено главное изображение");
            }
          }
        }

        // Удаляем изображения галереи
        if (carData.gallery_images) {
          const galleryImages = typeof carData.gallery_images === 'string' 
            ? JSON.parse(carData.gallery_images) 
            : carData.gallery_images;

          if (Array.isArray(galleryImages) && galleryImages.length > 0) {
            const imagePaths = galleryImages.map(url => {
              const filename = url.split('/').pop();
              return `car-${id}/${filename}`;
            });

            const { error: galleryDeleteError } = await supabaseAdmin.storage
              .from('car-images')
              .remove(imagePaths);

            if (galleryDeleteError) {
              console.log("⚠️ Не удалось удалить изображения галереи:", galleryDeleteError.message);
            } else {
              console.log(`✅ Удалено ${imagePaths.length} изображений галереи`);
            }
          }
        }

        // Удаляем всю папку машины (на случай если остались файлы)
        const { data: folderFiles } = await supabaseAdmin.storage
          .from('car-images')
          .list(`car-${id}`);

        if (folderFiles && folderFiles.length > 0) {
          const filePaths = folderFiles.map(file => `car-${id}/${file.name}`);
          const { error: folderDeleteError } = await supabaseAdmin.storage
            .from('car-images')
            .remove(filePaths);
            
          if (folderDeleteError) {
            console.log("⚠️ Не удалось удалить папку машины:", folderDeleteError.message);
          } else {
            console.log(`✅ Удалена папка car-${id} со всеми файлами`);
          }
        }
      } catch (storageError) {
        console.error("⚠️ Ошибка удаления изображений:", storageError);
        // Продолжаем даже если не удалось удалить изображения
      }

      // Теперь удаляем саму машину из базы данных
      const { error: deleteError } = await supabase
        .from("cars")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("❌ Ошибка удаления машины:", deleteError);
        return res
          .status(500)
          .json({ error: "Ошибка базы данных: " + deleteError.message });
      }

      console.log(`✅ Машина ID ${id} успешно удалена`);

      // Отправляем уведомление в Telegram
      try {
        const telegram = new TelegramNotifier();
        const carDataForTelegram = {
          make_name: carData.make_name,
          model_name: carData.model_name,
          production_year: carData.production_year,
          car_type: carData.car_type,
        };
        await telegram.sendMessage(
          telegram.formatCarDeletedMessage(carDataForTelegram)
        );
      } catch (error) {
        console.error("Ошибка отправки уведомления в Telegram:", error);
      }

      res.json({
        success: true,
        message: "Машина и все связанные данные успешно удалены",
        deletedBookings: bookingsCheck?.length || 0,
        carName: `${carData.make_name} ${carData.model_name} (${carData.production_year})`
      });
    } catch (error) {
      console.error("❌ Ошибка удаления машины:", error);
      res.status(500).json({ error: "Ошибка базы данных: " + error.message });
    }
  }
);

// Toggle premium status for a car
router.patch("/:id/premium", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const { is_premium } = req.body;

  if (typeof is_premium !== "boolean") {
    return res
      .status(400)
      .json({ error: "is_premium must be a boolean value" });
  }

  // Check if we're using Supabase

  try {
    const { data, error } = await supabase
      .from("cars")
      .update({ is_premium: is_premium })
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ Supabase premium toggle error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Car not found" });
    }

    res.json({
      success: true,
      message: `Car ${
        is_premium ? "marked as premium" : "removed from premium"
      } successfully`,
      is_premium: is_premium,
    });
  } catch (error) {
    console.error("❌ Supabase premium toggle error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Upload car images
router.post(
  "/:id/images",
  authenticateToken,
  validateParams(carIdSchema),
  async (req, res) => {
    const carId = req.params.id;

    try {
      let car;
      let headImagePath = null; // Initialize to null
      let galleryImagePaths = [];

      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("head_image, gallery_images")
        .eq("id", carId)
        .single();

      if (carError) {
        return res
          .status(500)
          .json({ error: "Database error: " + carError.message });
      }

      if (!carData) {
        return res.status(404).json({ error: "Car not found" });
      }

      car = carData;
      
      headImagePath = car.head_image || null;
      galleryImagePaths = car.gallery_images
        ? JSON.parse(car.gallery_images)
        : [];
      // Process head image if provided
      if (req.body.head_image && req.body.head_image.data) {
        try {
          const headImageData = req.body.head_image;

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(headImageData.data, "base64");

          // Create a file object for Supabase upload
          const headFile = {
            buffer: imageBuffer,
            mimetype: `image/${headImageData.extension || "jpeg"}`,
            originalname: `head.${headImageData.extension || "jpg"}`,
          };

          // Upload to Supabase Storage
          headImagePath = await uploadCarImage(headFile, carId, "head");
        } catch (error) {
          console.error("❌ Error uploading head image to Supabase:", error);
        }
      }

      // Process gallery images if provided
      const galleryUploadErrors = [];
      if (req.body.gallery_images && Array.isArray(req.body.gallery_images)) {
        for (let index = 0; index < req.body.gallery_images.length; index++) {
          const imageData = req.body.gallery_images[index];
          if (imageData && imageData.data) {
            try {
              // Convert base64 to buffer
              const imageBuffer = Buffer.from(imageData.data, "base64");

              // Create a file object for Supabase upload
              // Filename must be unique (timestamp + random + index) to avoid
              // colliding with images already stored for this car, which
              // otherwise causes silent "resource already exists" failures.
              const uniqueSuffix = `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
              const galleryFile = {
                buffer: imageBuffer,
                mimetype: `image/${imageData.extension || "jpeg"}`,
                originalname: `gallery_${uniqueSuffix}.${
                  imageData.extension || "jpg"
                }`,
              };

              // Upload to Supabase Storage
              const galleryImageUrl = await uploadCarImage(
                galleryFile,
                carId,
                "gallery"
              );
              galleryImagePaths.push(galleryImageUrl);
            } catch (error) {
              console.error(
                `❌ Error uploading gallery image ${index} to Supabase:`,
                error
              );
              galleryUploadErrors.push({
                index,
                message: error.message || String(error),
              });
            }
          }
        }
      }

      // Update car with new image paths
      const updateData = {
        head_image: headImagePath,
        gallery_images: JSON.stringify(galleryImagePaths),
      };

      // Update in Supabase
      const { error: updateError } = await supabase
        .from("cars")
        .update(updateData)
        .eq("id", carId);

      if (updateError) {
        console.error("❌ Supabase error updating car images:", updateError);
        return res
          .status(500)
          .json({ error: "Database error: " + updateError.message });
      }

      res.json({
        success: true,
        head_image: headImagePath,
        gallery_images: galleryImagePaths,
        ...(galleryUploadErrors.length > 0
          ? {
              gallery_upload_errors: galleryUploadErrors,
              warning: `${galleryUploadErrors.length} of ${req.body.gallery_images?.length || 0} gallery image(s) failed to upload`,
            }
          : {}),
      });
    } catch (error) {
      console.error("❌ Car image upload error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Delete a specific image from a car
router.delete(
  "/:id/images",
  authenticateToken,
  validateParams(carIdSchema),
  async (req, res) => {
    const carId = req.params.id;
    const imagePath = req.query.path;
    const imageType = req.query.type || "gallery"; // 'gallery' or 'head'

    if (!imagePath) {
      return res.status(400).json({ error: "Image path is required" });
    }

    try {
      // Get car data from Supabase
      const { data: car, error: carError } = await supabase
        .from("cars")
        .select("*")
        .eq("id", carId)
        .single();

      if (carError) {
        console.error("❌ Supabase error fetching car:", carError);
        return res
          .status(500)
          .json({ error: "Database error: " + carError.message });
      }

      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      let updateData = {};

      if (imageType === "head") {
        // Handle head image deletion
        if (car.head_image !== imagePath) {
          return res
            .status(400)
            .json({ error: "Head image path does not match" });
        }
        updateData.head_image = null;
      } else {
        // Handle gallery image deletion
        let galleryImages = [];
        try {
          galleryImages = car.gallery_images
            ? JSON.parse(car.gallery_images)
            : [];
          // Ensure it's an array
          if (!Array.isArray(galleryImages)) {
            galleryImages = [];
          }
        } catch (e) {
          console.error("Error parsing gallery_images:", e);
          galleryImages = [];
        }

        // Debug logs for troubleshooting

        // Check if the image exists in the gallery
        if (!galleryImages.includes(imagePath)) {
          return res.status(400).json({ error: "Image not found in gallery" });
        }

        // Remove the image from gallery_images array
        const updatedGallery = galleryImages.filter((img) => img !== imagePath);
        // Also remove any duplicates that might exist
        const uniqueGallery = [...new Set(updatedGallery)];
        updateData.gallery_images = JSON.stringify(uniqueGallery);
      }

      // Update car in Supabase
      const { error: updateError } = await supabase
        .from("cars")
        .update(updateData)
        .eq("id", carId);

      if (updateError) {
        console.error("❌ Supabase error updating car:", updateError);
        return res
          .status(500)
          .json({ error: "Database error: " + updateError.message });
      }

      // Delete the file from Supabase Storage
      try {
        // Extract file path from URL
        const url = new URL(imagePath);
        const filePath = url.pathname.replace(
          "/storage/v1/object/public/car-images/",
          ""
        );

        const { error: deleteError } = await supabaseAdmin.storage
          .from("car-images")
          .remove([filePath]);

        if (deleteError) {
          console.error("❌ Supabase Storage error:", deleteError);
          // Don't fail the request if file deletion fails, but log the issue
        } else {
        }
      } catch (error) {
        console.error("❌ Error deleting from Supabase Storage:", error);
        // Don't fail the request if file deletion fails
      }

      // Return success response
      if (imageType === "head") {
        res.json({ success: true, message: "Head image deleted successfully" });
      } else {
        res.json({
          success: true,
          gallery_images: JSON.parse(updateData.gallery_images),
          message: "Gallery image deleted successfully",
        });
      }
    } catch (error) {
      console.error("❌ Supabase image deletion error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
    }
  }
);

// Reorder cars endpoint
router.post(
  "/reorder",
  authenticateToken,
  validate(carReorderSchema),
  async (req, res) => {
    const { carOrder } = req.body;

    if (!carOrder || !Array.isArray(carOrder)) {
      return res.status(400).json({ error: "Invalid car order array" });
    }

    try {
      // Update each car's display_order using Supabase
      const updatePromises = carOrder.map((carId, index) => {
        return supabase
          .from("cars")
          .update({ display_order: index })
          .eq("id", carId);
      });

      const results = await Promise.all(updatePromises);

      // Check for any errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error("❌ Supabase reorder errors:", errors);
        return res
          .status(500)
          .json({ error: "Failed to update car order in Supabase" });
      }

      res.json({ success: true, message: "Cars reordered successfully" });
    } catch (error) {
      console.error("❌ Supabase reorder error:", error);
      res.status(500).json({ error: "Failed to update car order" });
    }
  }
);

// Function to check car availability for specific dates
async function checkCarAvailability(carId, pickupDate, returnDate) {
  try {
    // Get confirmed bookings for this car in the date range
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("pickup_date, return_date")
      .eq("car_id", carId)
      .eq("status", "confirmed")
      .or(`pickup_date.lte.${returnDate},return_date.gte.${pickupDate}`);

    if (error) {
      console.error("❌ Supabase availability check error:", error);
      throw new Error("Failed to check availability in Supabase");
    }

    // Check for overlapping bookings
    const hasConflict = bookings.some((booking) => {
      const bookingPickup = new Date(booking.pickup_date);
      const bookingReturn = new Date(booking.return_date);
      const requestedPickup = new Date(pickupDate);
      const requestedReturn = new Date(returnDate);

      // For same-day rentals, allow them (no conflict)
      if (requestedPickup.toDateString() === requestedReturn.toDateString()) {
        return false; // Same-day rentals are allowed
      }

      // For multi-day rentals, check for overlap
      return bookingPickup < requestedReturn && bookingReturn > requestedPickup;
    });

    return {
      available: !hasConflict,
      conflicting_bookings: hasConflict ? bookings.length : 0,
    };
  } catch (error) {
    console.error("Error in checkCarAvailability:", error);
    throw error;
  }
}

// Check car availability for specific dates
router.get("/:id/availability", async (req, res) => {
  const carId = req.params.id;
  const { pickup_date, return_date } = req.query;

  if (!pickup_date || !return_date) {
    return res
      .status(400)
      .json({ error: "pickup_date and return_date are required" });
  }

  try {
    const availability = await checkCarAvailability(
      carId,
      pickup_date,
      return_date
    );
    res.json(availability);
  } catch (error) {
    console.error("Error checking car availability:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Get all confirmed booking dates for a specific car (for calendar availability)
router.get("/:id/booking-dates", async (req, res) => {
  const carId = req.params.id;

  try {
    // Get all CONFIRMED bookings for this car
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("pickup_date, return_date, status")
      .eq("car_id", carId)
      .eq("status", "confirmed")
      .order("pickup_date", { ascending: true });

    if (error) {
      console.error("Error fetching booking dates:", error);
      return res
        .status(500)
        .json({ error: "Database error: " + error.message });
    }

    // Format the dates for frontend consumption
    const bookingDates = bookings.map((booking) => ({
      pickup_date: booking.pickup_date,
      return_date: booking.return_date,
      status: booking.status,
    }));

    res.json({
      car_id: carId,
      booking_dates: bookingDates,
      total_bookings: bookingDates.length,
    });
  } catch (error) {
    console.error("Error fetching car booking dates:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

module.exports = router;
module.exports.readSeoPrimary = readSeoPrimary;
