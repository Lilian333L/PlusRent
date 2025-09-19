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
        const headImageData = req.body.head_image;

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(headImageData.data, "base64");

        // Create a file object for Supabase upload
        const headFile = {
          buffer: imageBuffer,
          mimetype: `image/${headImageData.extension || "jpeg"}`,
          originalname: `head.${headImageData.extension || "jpg"}`,
        };

        // We'll upload this after creating the car record
        headImageUrl = headFile; // Store the file object for upload after car creation
      } catch (error) {
        console.error("❌ Error preparing head image:", error);
      }
    }

    // Process gallery images if provided
    if (req.body.gallery_images && Array.isArray(req.body.gallery_images)) {
      req.body.gallery_images.forEach((imageData, index) => {
        if (imageData && imageData.data) {
          try {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(imageData.data, "base64");

            // Create a file object for Supabase upload
            const galleryFile = {
              buffer: imageBuffer,
              mimetype: `image/${imageData.extension || "jpeg"}`,
              originalname: `gallery_${index}.${imageData.extension || "jpg"}`,
            };

            galleryImageUrls.push(galleryFile);
          } catch (error) {
            console.error(`❌ Error preparing gallery image ${index}:`, error);
          }
        }
      });
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

      // Upload images to Supabase Storage now that we have the car ID
      let finalHeadImageUrl = null;
      let finalGalleryImageUrls = [];

      // Upload head image if provided
      if (headImageUrl && typeof headImageUrl === "object") {
        try {
          finalHeadImageUrl = await uploadCarImage(headImageUrl, carId, "head");
        } catch (error) {
          console.error("❌ Error uploading head image to Supabase:", error);
        }
      }

      // Upload gallery images if provided
      for (let i = 0; i < galleryImageUrls.length; i++) {
        if (galleryImageUrls[i] && typeof galleryImageUrls[i] === "object") {
          try {
            const galleryUrl = await uploadCarImage(
              galleryImageUrls[i],
              carId,
              "gallery"
            );
            finalGalleryImageUrls.push(galleryUrl);
          } catch (error) {
            console.error(
              `❌ Error uploading gallery image ${i + 1} to Supabase:`,
              error
            );
          }
        }
      }

      // Update car with image URLs if any images were uploaded
      if (finalHeadImageUrl || finalGalleryImageUrls.length > 0) {
        const imageUpdateData = {};
        if (finalHeadImageUrl) imageUpdateData.head_image = finalHeadImageUrl;
        if (finalGalleryImageUrls.length > 0)
          imageUpdateData.gallery_images = JSON.stringify(
            finalGalleryImageUrls
          );

        const { error: updateError } = await supabase
          .from("cars")
          .update(imageUpdateData)
          .eq("id", carId);

        if (updateError) {
          console.error("❌ Error updating car with image URLs:", updateError);
        } else {
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

      res.json({ success: true, id: carId });
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
      // First, get the car data to check for images
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

      if (carError) {
        console.error("❌ Supabase error fetching car for deletion:", carError);
        return res
          .status(500)
          .json({ error: "Database error: " + carError.message });
      }

      if (!carData) {
        return res.status(404).json({ error: "Car not found" });
      }

      // Delete the car from Supabase
      const { error: deleteError } = await supabase
        .from("cars")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("❌ Supabase car deletion error:", deleteError);
        return res
          .status(500)
          .json({ error: "Database error: " + deleteError.message });
      }

      // Send Telegram notification
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
        console.error("Error sending Telegram notification:", error);
      }

      res.json({
        success: true,
        message: "Car and all associated assets deleted successfully",
      });
    } catch (error) {
      console.error("❌ Supabase car deletion error:", error);
      res.status(500).json({ error: "Database error: " + error.message });
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
      if (req.body.gallery_images && Array.isArray(req.body.gallery_images)) {
        for (let index = 0; index < req.body.gallery_images.length; index++) {
          const imageData = req.body.gallery_images[index];
          if (imageData && imageData.data) {
            try {
              // Convert base64 to buffer
              const imageBuffer = Buffer.from(imageData.data, "base64");

              // Create a file object for Supabase upload
              const galleryFile = {
                buffer: imageBuffer,
                mimetype: `image/${imageData.extension || "jpeg"}`,
                originalname: `gallery_${index}.${
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
