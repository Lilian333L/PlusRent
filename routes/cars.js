const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const db = require('../config/database');
const TelegramNotifier = require('../config/telegram');
const { supabase, supabaseAdmin, uploadCarImage, getCarImageUrl } = require('../lib/supabaseClient');

// Check if we're in Vercel environment
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Function to upload file to Supabase Storage
async function uploadToSupabaseStorage(file, carId, fileType = 'gallery') {
  try {
    console.log('🔍 uploadToSupabaseStorage called with:', {
      carId,
      fileType,
      hasFile: !!file,
      hasBuffer: !!file?.buffer,
      bufferSize: file?.buffer?.length,
      originalname: file?.originalname,
      mimetype: file?.mimetype
    });
    
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = fileType === 'head' ? `head${ext}` : `gallery_${timestamp}${ext}`;
    const filePath = `cars/${carId}/${fileName}`;
    
    console.log('📤 Uploading to Supabase Storage:', {
      filePath,
      fileName,
      ext,
      timestamp
    });
    
    console.log('🔍 Supabase client check:', {
      hasSupabase: !!supabase,
      hasStorage: !!supabase?.storage,
      hasFrom: !!supabase?.storage?.from
    });
    
    const { data, error } = await supabaseAdmin.storage
      .from('car-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });
    
    if (error) {
      console.error('❌ Supabase Storage upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        details: error.details
      });
      throw error;
    }
    
    console.log('✅ Supabase Storage upload successful:', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('car-images')
      .getPublicUrl(filePath);
    
    console.log('✅ File uploaded to Supabase Storage:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('❌ Error uploading to Supabase Storage:', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

// Function to check if a car is available for specific dates
async function checkCarAvailability(carId, pickupDate, returnDate) {
  try {
    // Get all bookings for this car (both pending and confirmed)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('pickup_date, return_date, status')
      .eq('car_id', carId)
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Error fetching bookings for availability check:', error);
      return { available: false, reason: 'Database error' };
    }

    const requestedPickup = new Date(pickupDate);
    const requestedReturn = new Date(returnDate);

    // Check for date conflicts with existing bookings
    for (const booking of bookings) {
      const bookingPickup = new Date(booking.pickup_date);
      const bookingReturn = new Date(booking.return_date);

      // Check if there's any overlap between the requested dates and existing booking dates
      if (
        (requestedPickup <= bookingReturn && requestedReturn >= bookingPickup) ||
        (bookingPickup <= requestedReturn && bookingReturn >= requestedPickup)
      ) {
        return { 
          available: false, 
          reason: `Car is booked from ${bookingPickup.toLocaleDateString()} to ${bookingReturn.toLocaleDateString()}` 
        };
      }
    }

    return { available: true };
  } catch (error) {
    console.error('Error in checkCarAvailability:', error);
    return { available: false, reason: 'System error' };
  }
}

// Function to check if a car is currently unavailable and when it will be available
async function getNextAvailableDate(carId) {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Compare dates only
    
    // Get all CONFIRMED bookings for this car (only confirmed bookings make car unavailable)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('pickup_date, return_date')
      .eq('car_id', carId)
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error fetching bookings for availability check:', error);
      return null;
    }

    if (!bookings || bookings.length === 0) {
      return null; // Available now
    }

    // Check if car is currently being used (between pickup and return dates)
    const currentBookings = bookings.filter(booking => {
      const pickupDate = new Date(booking.pickup_date);
      const returnDate = new Date(booking.return_date);
      pickupDate.setHours(0, 0, 0, 0);
      returnDate.setHours(0, 0, 0, 0);
      
      // Car is currently being used if current date is between pickup and return dates
      return currentDate >= pickupDate && currentDate <= returnDate;
    });

    if (currentBookings.length > 0) {
      // Car is currently being used, find the latest return date
      const latestReturnDate = new Date(Math.max(...currentBookings.map(b => new Date(b.return_date))));
      latestReturnDate.setHours(0, 0, 0, 0);
      
      // Add one day to get the next available date
      const nextAvailable = new Date(latestReturnDate);
      nextAvailable.setDate(nextAvailable.getDate() + 1);
      
      return nextAvailable;
    }

    // Car is not currently being used and no current bookings
    // Don't return future booking dates - car is available now
    return null;

    // No current or future bookings, car is available
    return null;
  } catch (error) {
    console.error('Error in getNextAvailableDate:', error);
    return null;
  }
}

// Use memory storage for Vercel (files will be uploaded to Supabase Storage)
const memoryStorage = multer.memoryStorage();

// Multer storage config - use memory storage for Vercel, disk storage for local dev
const tempImageStorage = isVercel ? memoryStorage : multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const base = file.fieldname === 'head_image' ? 'head' : `gallery_${timestamp}`;
    cb(null, base + ext);
  }
});

// Multer storage config for car images (with car ID)
const carImageStorage = isVercel ? memoryStorage : multer.diskStorage({
  destination: function (req, file, cb) {
    const carId = req.params.id;
    const dir = path.join(__dirname, '..', 'uploads', `car-${carId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = file.fieldname === 'head_image' ? 'head' : `gallery_${Date.now()}`;
    cb(null, base + ext);
  }
});

// Simple multer config for parsing FormData (no file storage)
const formDataUpload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024 // 50MB limit for fields
  }
});

const upload = multer({ 
  storage: carImageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024 // 50MB limit for fields
  }
});
const tempUpload = multer({ 
  storage: tempImageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024 // 50MB limit for fields
  }
});

// Get all cars with filtering
router.get('/', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  console.log('🔍 Cars API - Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    isSupabase: isSupabase
  });
  
  if (isSupabase) {
    // Use native Supabase client for filtering
    try {
      console.log('🔍 Using Supabase client for cars filtering');
      let query = supabase.from('cars').select('*');
      
      // Helper to add filters
      function addFilter(field, param) {
        if (req.query[param] && req.query[param] !== '') {
          const values = req.query[param].split(',').map(v => v.trim()).filter(Boolean);
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
      addFilter('make_name', 'make_name');
      addFilter('model_name', 'model_name');
      addFilter('gear_type', 'gear_type');
      addFilter('fuel_type', 'fuel_type');
      addFilter('car_type', 'car_type');
      addFilter('num_doors', 'num_doors');
      addFilter('num_passengers', 'num_passengers');
      
      // Year filters
      if (req.query.min_year && req.query.min_year !== '') {
        query = query.gte('production_year', req.query.min_year);
      }
      if (req.query.max_year && req.query.max_year !== '') {
        query = query.lte('production_year', req.query.max_year);
      }
      
      // NOTE: Supabase does not have a daily_rate column. We'll filter by price in-memory
      // based on price_policy['1-2'] after fetching results.
      
      // Order by display_order first, then by id for consistency
      query = query.order('display_order', { ascending: true }).order('id', { ascending: true });
      
      const { data, error } = await query;
      
      console.log('🔍 Supabase query result:', { 
        hasData: !!data, 
        dataLength: data ? data.length : 0,
        hasError: !!error,
        error: error ? error.message : null
      });
      
      if (error) {
        console.error('❌ Supabase query error:', error);
        return res.status(500).json({ error: 'Database error', details: error.message });
      }
      
      // Parse price_policy and gallery_images for each car
      const cars = data.map(car => {
        // Parse price_policy if it's a string
        if (car.price_policy && typeof car.price_policy === 'string') {
          try {
            car.price_policy = JSON.parse(car.price_policy);
          } catch (e) {
            console.warn('Failed to parse price_policy for car:', car.id);
          }
        }
        
        // Parse gallery_images if it's a string
        if (car.gallery_images && typeof car.gallery_images === 'string') {
          try {
            car.gallery_images = JSON.parse(car.gallery_images);
          } catch (e) {
            console.warn('Failed to parse gallery_images for car:', car.id);
          }
        }
        
        return car;
      });

      // Calculate availability for each car dynamically
      const carsWithAvailability = await Promise.all(cars.map(async (car) => {
        try {
          const nextAvailableDate = await getNextAvailableDate(car.id);
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // Compare dates only
          
          if (nextAvailableDate) {
            // Car is unavailable
            car.booked = true;
            car.booked_until = nextAvailableDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            // Car is available
            car.booked = false;
            car.booked_until = null;
          }
        } catch (error) {
          console.error(`Error calculating availability for car ${car.id}:`, error);
          // Default to available if there's an error
          car.booked = false;
          car.booked_until = null;
        }
        
        return car;
      }));
      
      // In-memory price filtering based on price_policy['1-2']
      const minPrice = (req.query.min_price && req.query.min_price !== '') ? parseFloat(req.query.min_price) : null;
      const maxPrice = (req.query.max_price && req.query.max_price !== '') ? parseFloat(req.query.max_price) : null;
      let filteredCars = carsWithAvailability;
      if (minPrice !== null || maxPrice !== null) {
        filteredCars = carsWithAvailability.filter(car => {
          const pp = car.price_policy || {};
          const rateRaw = pp['1-2'];
          const rate = rateRaw !== undefined && rateRaw !== null ? parseFloat(rateRaw) : NaN;
          if (Number.isNaN(rate)) return false;
          if (minPrice !== null && rate < minPrice) return false;
          if (maxPrice !== null && rate > maxPrice) return false;
          return true;
        });
      }
      
      res.json(filteredCars);
      
    } catch (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
  }
});

// Get cars for booking form (only available cars with basic info)
router.get('/booking/available', async (req, res) => {
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for available cars fetch');
      
      const { data, error } = await supabase
        .from('cars')
        .select('id, make_name, model_name, production_year, head_image, price_policy, booked, car_type, num_doors, num_passengers, fuel_type, gear_type')
        .or('booked.eq.0,booked.is.null')
        .order('make_name', { ascending: true })
        .order('model_name', { ascending: true });
      
      if (error) {
        console.error('❌ Supabase error fetching available cars:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      // Parse price_policy for each car and format for display
      const cars = data.map(car => {
        // Supabase already returns parsed JSON, so only parse if it's a string
        const pricePolicy = typeof car.price_policy === 'string' 
          ? (car.price_policy ? JSON.parse(car.price_policy) : {})
          : (car.price_policy || {});
        const dailyPrice = pricePolicy['1-2'] || 'N/A';
        
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
          data_src: car.head_image ? (car.head_image.startsWith('http') ? car.head_image : `${req.protocol}://${req.get('host')}${car.head_image}`) : `images/cars-alt/bmw-m5.png`
        };
      });
      
      console.log('✅ Available cars fetched successfully from Supabase');
      res.json(cars);
      
    } catch (error) {
      console.error('❌ Supabase error fetching available cars:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
});

// Get single car by ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for single car fetch');
      
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ Supabase error fetching car:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      // Parse JSON fields if they're strings
      if (typeof data.price_policy === 'string') {
        data.price_policy = data.price_policy ? JSON.parse(data.price_policy) : {};
      }
      if (typeof data.gallery_images === 'string') {
        data.gallery_images = data.gallery_images ? JSON.parse(data.gallery_images) : [];
      }
      
      console.log('✅ Car fetched successfully from Supabase');
      res.json(data);
      
    } catch (error) {
      console.error('❌ Supabase error fetching car:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
});

// Add new car
router.post('/', async (req, res) => {
  console.log('Car creation request body:', req.body);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  // Handle base64 image uploads for Supabase Storage
  let headImageUrl = null;
  let galleryImageUrls = [];
  
  // Process head image if provided
  if (req.body.head_image && req.body.head_image.data) {
    try {
      const headImageData = req.body.head_image;
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(headImageData.data, 'base64');
      
      // Create a file object for Supabase upload
      const headFile = {
        buffer: imageBuffer,
        mimetype: `image/${headImageData.extension || 'jpeg'}`,
        originalname: `head.${headImageData.extension || 'jpg'}`
      };
      

      // Upload to Supabase Storage (we'll get the car ID later)
      headImageUrl = headFile; // Store the file object for later upload

      // Store the file object for later upload (we need the car ID first)
      headImageUrl = headFile;

      console.log('✅ Head image prepared for Supabase upload');
    } catch (error) {
      console.error('❌ Error preparing head image:', error);
    }
  }
  
  // Process gallery images if provided
  if (req.body.gallery_images && Array.isArray(req.body.gallery_images)) {
    req.body.gallery_images.forEach((imageData, index) => {
      if (imageData && imageData.data) {
        try {
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(imageData.data, 'base64');
          
          // Create a file object for Supabase upload
          const galleryFile = {
            buffer: imageBuffer,
            mimetype: `image/${imageData.extension || 'jpeg'}`,
            originalname: `gallery_${index}.${imageData.extension || 'jpg'}`
          };
          
          galleryImageUrls.push(galleryFile);
          console.log('✅ Gallery image prepared for Supabase upload:', index);
        } catch (error) {
          console.error(`❌ Error preparing gallery image ${index}:`, error);
        }
      }
    });
  }
  
  console.log('📊 Summary:');
  console.log('  Head image prepared:', headImageUrl ? 'Yes' : 'No');
  console.log('  Gallery images prepared:', galleryImageUrls.length);
  
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
                    description_ru
                  } = req.body;
  
  // Parse price_policy if it's a JSON string
  let price_policy;
  try {
    price_policy = typeof pricePolicyRaw === 'string' ? JSON.parse(pricePolicyRaw) : pricePolicyRaw;
  } catch (error) {
    console.error('Error parsing price_policy:', error);
    price_policy = {};
  }

  // For electric cars, engine_capacity can be null
  const isElectric = fuel_type === 'Electric';

  // Check all required fields that match frontend validation
  const requiredFields = {
    make_name: 'Make Name',
    model_name: 'Model Name', 
    production_year: 'Production Year',
    gear_type: 'Gear Type',
    fuel_type: 'Fuel Type',
    car_type: 'Car Type',
    num_doors: 'Number of Doors',
    num_passengers: 'Number of Passengers'
  };

  // Check price policy fields
  const requiredPriceFields = {
    '1-2': 'Price 1-2 days',
    '3-7': 'Price 3-7 days', 
    '8-20': 'Price 8-20 days',
    '21-45': 'Price 21-45 days',
    '46+': 'Price 46+ days'
  };

  const missingFields = [];

  // Check basic required fields
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!req.body[field] || req.body[field].toString().trim() === '') {
      missingFields.push(label);
    }
  }

  // Check price policy fields
  if (!price_policy) {
    missingFields.push('Price Policy');
  } else {
    for (const [key, label] of Object.entries(requiredPriceFields)) {
      if (!price_policy[key] || price_policy[key].toString().trim() === '') {
        missingFields.push(label);
      }
    }
  }

  // Check engine capacity for non-electric cars
  if (!isElectric && (!engine_capacity || engine_capacity.toString().trim() === '')) {
    missingFields.push('Engine Capacity');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      missingFields: missingFields
    });
  }

  let engineCapacityValue = null;
  
  // Only validate and convert engine_capacity for non-electric cars
  if (!isElectric) {
    // Parse engine_capacity as a float to support decimal values
    engineCapacityValue = parseFloat(engine_capacity);
    if (isNaN(engineCapacityValue) || engineCapacityValue <= 0) {
      return res.status(400).json({ error: 'Engine capacity must be a positive number' });
    }
  }

  // Convert all price_policy values to strings and ensure keys are properly formatted
  const pricePolicyStringified = {};
  for (const key in price_policy) {
    // Ensure the key is properly formatted for JSON
    const formattedKey = key.replace(/^(\d+)-(\d+)$/, '$1-$2');
    pricePolicyStringified[formattedKey] = String(price_policy[key]);
  }

  // Parse optional numeric fields
  const mileageValue = mileage ? parseInt(mileage) : null;
  const fuelEconomyValue = fuel_economy ? parseFloat(fuel_economy) : null;
  const rcaInsuranceValue = rca_insurance_price ? parseFloat(rca_insurance_price) : null;
  const cascoInsuranceValue = casco_insurance_price ? parseFloat(casco_insurance_price) : null;
  const likesValue = likes ? parseInt(likes) : 0;
  
  // Create multilingual description object
  const descriptionObj = {};
  if (description_en) descriptionObj.en = description_en;
  if (description_ro) descriptionObj.ro = description_ro;
  if (description_ru) descriptionObj.ru = description_ru;
  const descriptionJson = JSON.stringify(descriptionObj);

  // Store in DB, booked defaults to 0
  console.log('Inserting car with data:', {
    make_name,
    model_name,
    production_year,
    gear_type,
    fuel_type,
    engineCapacityValue,
    car_type,
    num_doors,
    num_passengers,
    price_policy: JSON.stringify(pricePolicyStringified),
    booked_until: booked_until || null,
    luggage: luggage || null,
    mileageValue,
    drive: drive || null,
    fuelEconomyValue,
    exterior_color: exterior_color || null,
    interior_color: interior_color || null,
    rcaInsuranceValue,
    cascoInsuranceValue,
    likesValue
  });
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for car creation');
      
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
        head_image: null, // Will be updated after Supabase Storage upload
        gallery_images: JSON.stringify([]), // Will be updated after Supabase Storage upload
        is_premium: false,
        display_order: 0,
        status: 'active'
      };
      
      // Remove null/undefined values to avoid Supabase errors
      Object.keys(carData).forEach(key => {
        if (carData[key] === null || carData[key] === undefined) {
          delete carData[key];
        }
      });
      
      const { data, error } = await supabase
        .from('cars')
        .insert(carData)
        .select();
      
      if (error) {
        console.error('❌ Supabase car creation error:', error);
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      const carId = data[0].id;
      console.log('✅ Car created successfully in Supabase with ID:', carId);
      
      // Upload images to Supabase Storage if provided
      if (headImageUrl || galleryImageUrls.length > 0) {
        console.log('📁 Uploading images to Supabase Storage for car ID:', carId);
        
        let finalHeadImageUrl = null;
        let finalGalleryImageUrls = [];
        
        // Upload head image if provided
        if (headImageUrl) {
          try {
            console.log('🖼️ Uploading head image to Supabase Storage...');
            finalHeadImageUrl = await uploadToSupabaseStorage(headImageUrl, carId, 'head');
            console.log('✅ Head image uploaded successfully:', finalHeadImageUrl);
          } catch (error) {
            console.error('❌ Error uploading head image to Supabase:', error);
          }
        }
        
        // Upload gallery images if provided
        for (let i = 0; i < galleryImageUrls.length; i++) {
          try {
            console.log(`🖼️ Uploading gallery image ${i + 1} to Supabase Storage...`);
            const galleryUrl = await uploadToSupabaseStorage(galleryImageUrls[i], carId, 'gallery');
            finalGalleryImageUrls.push(galleryUrl);
            console.log(`✅ Gallery image ${i + 1} uploaded successfully:`, galleryUrl);
          } catch (error) {
            console.error(`❌ Error uploading gallery image ${i + 1} to Supabase:`, error);
          }
        }
        
        // Update database with Supabase Storage URLs
        const updateData = {};
        if (finalHeadImageUrl) updateData.head_image = finalHeadImageUrl;
        if (finalGalleryImageUrls.length > 0) updateData.gallery_images = JSON.stringify(finalGalleryImageUrls);
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('cars')
            .update(updateData)
            .eq('id', carId);
          
          if (updateError) {
            console.error('❌ Error updating image URLs:', updateError);
          } else {
            console.log('✅ Image URLs updated successfully in database');
          }
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
          casco_insurance_price: cascoInsuranceValue
        };
        await telegram.sendMessage(telegram.formatCarAddedMessage(telegramCarData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
      
      res.json({ success: true, id: carId });
      
    } catch (error) {
      console.error('❌ Supabase car creation error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }

  } else {
    // Use SQLite
  db.run(
    `INSERT INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, booked, booked_until, luggage, mileage, drive, fuel_economy, exterior_color, interior_color, rca_insurance_price, casco_insurance_price, likes, description, head_image, gallery_images, is_premium)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)` ,
    [
      make_name,
      model_name,
      production_year,
      gear_type,
      fuel_type,
      engineCapacityValue,
      car_type,
      num_doors,
      num_passengers,
      JSON.stringify(pricePolicyStringified),
      booked_until || null,
      luggage || null,
      mileageValue,
      drive || null,
      fuelEconomyValue,
      exterior_color || null,
      interior_color || null,
      rcaInsuranceValue,
      cascoInsuranceValue,
      likesValue,
      descriptionJson,
      headImagePath,
      JSON.stringify(galleryImagePaths)
    ],
    async function (err) {
      if (err) {
        console.error('Database error details:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      

      const carId = this.lastID;
      // Send Telegram notification - COMMENTED OUT
      // try {
      //   const telegram = new TelegramNotifier();
      //   const carData = {
      //     make_name,
      //     model_name,
      //     production_year,
      //     gear_type,
      //     fuel_type,
      //     car_type,
      //     num_doors,
      //     num_passengers,
      //     price_policy: pricePolicyStringified,
      //     rca_insurance_price: rcaInsuranceValue,
      //     casco_insurance_price: cascoInsuranceValue
      //   };
      //   await telegram.sendMessage(telegram.formatCarAddedMessage(carData));
      // } catch (error) {
      //   console.error('Error sending Telegram notification:', error);
      // }
      
      // Upload images to Supabase Storage
      if (headImageUrl || galleryImageUrls.length > 0) {
        console.log('📁 Uploading images to Supabase Storage for car ID:', carId);
        
        let finalHeadImageUrl = null;
        let finalGalleryImageUrls = [];
        
        // Upload head image if provided
        if (headImageUrl) {
          try {
            console.log('🖼️ Uploading head image to Supabase Storage...');
            finalHeadImageUrl = await uploadCarImage(headImageUrl, carId, 'head');
            console.log('✅ Head image uploaded successfully:', finalHeadImageUrl);
          } catch (error) {
            console.error('❌ Error uploading head image to Supabase:', error);
          }
        }
        
        // Upload gallery images if provided
        for (let i = 0; i < galleryImageUrls.length; i++) {
          try {
            console.log(`🖼️ Uploading gallery image ${i + 1} to Supabase Storage...`);
            const galleryUrl = await uploadCarImage(galleryImageUrls[i], carId, 'gallery');
            finalGalleryImageUrls.push(galleryUrl);
            console.log(`✅ Gallery image ${i + 1} uploaded successfully:`, galleryUrl);
          } catch (error) {
            console.error(`❌ Error uploading gallery image ${i + 1} to Supabase:`, error);
          }
        }
        
        // Update database with Supabase Storage URLs
        const updateSql = `UPDATE cars SET head_image = ?, gallery_images = ? WHERE id = ?`;
        console.log('🖼️ Updating database with Supabase Storage URLs:');
        console.log('  Head image URL:', finalHeadImageUrl);
        console.log('  Gallery image URLs:', finalGalleryImageUrls);
        console.log('  Car ID:', carId);
        
        console.log('🔍 About to execute database update with:');
        console.log('  SQL:', updateSql);
        console.log('  Parameters:', [finalHeadImageUrl, JSON.stringify(finalGalleryImageUrls), carId]);
        
        db.run(updateSql, [
          finalHeadImageUrl,
          JSON.stringify(finalGalleryImageUrls),
          carId
        ], (updateErr) => {
          if (updateErr) {
            console.error('❌ Error updating image URLs:', updateErr);
          } else {
            console.log('✅ Image URLs updated successfully in database');
            console.log('  Updated car ID:', carId);
            console.log('  Final head image URL:', finalHeadImageUrl);
            console.log('  Final gallery image URLs:', finalGalleryImageUrls);
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
              casco_insurance_price: cascoInsuranceValue
            };
            telegram.sendMessage(telegram.formatCarAddedMessage(carData));
          } catch (error) {
            console.error('Error sending Telegram notification:', error);
          }
          
          res.json({ success: true, id: carId });
        });
      } else {
        // No images to upload, send response immediately
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
            casco_insurance_price: cascoInsuranceValue
          };
          telegram.sendMessage(telegram.formatCarAddedMessage(carData));
        } catch (error) {
          console.error('Error sending Telegram notification:', error);
        }
        
        res.json({ success: true, id: carId });
      }
    }
  );


  }
});

// Update car
router.put('/:id', formDataUpload.any(), (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FIELD_SIZE') {
      return res.status(413).json({ error: 'Field too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  next();
}, async (req, res) => {
  console.log('🔍 SERVER - Multer middleware executed');
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  console.log('🔍 SERVER - PUT /api/cars/:id received request');
  console.log('  Car ID:', id);
  console.log('  Content-Type:', req.headers['content-type']);
  console.log('  Raw body keys:', Object.keys(req.body));
  console.log('  Raw body:', req.body);
  console.log('  Files in request:', req.files);
  if (req.files && req.files.length > 0) {
    console.log('  Files details:');
    req.files.forEach((file, index) => {
      console.log(`    File ${index + 1}:`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
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
    description_ru
  } = req.body;

  // Parse price_policy if it comes as a JSON string (from FormData)
  let price_policy;
  try {
    price_policy = typeof rawPricePolicy === 'string' ? JSON.parse(rawPricePolicy) : rawPricePolicy;
  } catch (error) {
    console.error('Error parsing price_policy:', error);
    return res.status(400).json({ error: 'Invalid price_policy format' });
  }
  
  console.log('🔍 SERVER - Extracted values:');
  console.log('  make_name:', make_name);
  console.log('  model_name:', model_name);
  console.log('  production_year:', production_year);
  console.log('  gear_type:', gear_type);
  console.log('  fuel_type:', fuel_type);
  console.log('  engine_capacity:', engine_capacity);
  console.log('  car_type:', car_type);
  console.log('  num_doors:', num_doors);
  console.log('  num_passengers:', num_passengers);
  console.log('  rawPricePolicy:', rawPricePolicy);
  console.log('  parsed price_policy:', price_policy);
  console.log('  rca_insurance_price:', rca_insurance_price);
  console.log('  casco_insurance_price:', casco_insurance_price);
  console.log('  likes:', likes);
  console.log('  description_en:', description_en);
  console.log('  description_ro:', description_ro);
  console.log('  description_ru:', description_ru);

  // For electric cars, engine_capacity can be null
  const isElectric = fuel_type === 'Electric';

  // Check all required fields that match frontend validation
  const requiredFields = {
    make_name: 'Make Name',
    model_name: 'Model Name', 
    production_year: 'Production Year',
    gear_type: 'Gear Type',
    fuel_type: 'Fuel Type',
    car_type: 'Car Type',
    num_doors: 'Number of Doors',
    num_passengers: 'Number of Passengers'
  };

  // Check price policy fields
  const requiredPriceFields = {
    '1-2': 'Price 1-2 days',
    '3-7': 'Price 3-7 days', 
    '8-20': 'Price 8-20 days',
    '21-45': 'Price 21-45 days',
    '46+': 'Price 46+ days'
  };

  const missingFields = [];

  // Check basic required fields
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!req.body[field] || req.body[field].toString().trim() === '') {
      missingFields.push(label);
    }
  }

  // Check price policy fields
  if (!price_policy) {
    missingFields.push('Price Policy');
  } else {
    for (const [key, label] of Object.entries(requiredPriceFields)) {
      if (!price_policy[key] || price_policy[key].toString().trim() === '') {
        missingFields.push(label);
      }
    }
  }

  // Check engine capacity for non-electric cars
  if (!isElectric && (!engine_capacity || engine_capacity.toString().trim() === '')) {
    missingFields.push('Engine Capacity');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      missingFields: missingFields
    });
  }

  let engineCapacityValue = null;
  
  // Only validate and convert engine_capacity for non-electric cars
  if (!isElectric && engine_capacity !== undefined && engine_capacity !== '') {
    // Parse engine_capacity as a float to support decimal values
    engineCapacityValue = parseFloat(engine_capacity);
    if (isNaN(engineCapacityValue) || engineCapacityValue <= 0) {
      return res.status(400).json({ error: 'Engine capacity must be a positive number' });
    }
  }

  const pricePolicyStringified = {};
  for (const key in price_policy) {
    pricePolicyStringified[key] = String(price_policy[key]);
  }

  // Parse optional numeric fields
  const mileageValue = mileage ? parseInt(mileage) : null;
  const fuelEconomyValue = fuel_economy ? parseFloat(fuel_economy) : null;
  const rcaInsuranceValue = rca_insurance_price ? parseFloat(rca_insurance_price) : null;
  const cascoInsuranceValue = casco_insurance_price ? parseFloat(casco_insurance_price) : null;
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

  // Handle file uploads if any files were uploaded
  let headImagePath = null;
  let galleryImagePaths = [];
  
  // First, get existing images from database to preserve them
  try {
    const { data: existingCar, error: carError } = await supabase
      .from('cars')
      .select('head_image, gallery_images')
      .eq('id', id)
      .single();
    
    if (carError || !existingCar) {
      console.error('❌ Error fetching existing car data:', carError);
      return res.status(500).json({ error: 'Database error: ' + (carError?.message || 'Car not found') });
    }
    
    // Preserve existing head image if no new one uploaded
    if (!req.files || !req.files.find(f => f.fieldname === 'head_image')) {
      headImagePath = existingCar.head_image;
    }
    
    // Use gallery images from form data if provided, otherwise preserve existing ones
    if (req.body.gallery_images) {
      try {
        galleryImagePaths = JSON.parse(req.body.gallery_images);
        console.log('🔍 SERVER - Using gallery images from form data:', galleryImagePaths);
      } catch (e) {
        console.log('Could not parse gallery images from form data, using existing ones');
        if (existingCar.gallery_images) {
          try {
            galleryImagePaths = JSON.parse(existingCar.gallery_images);
            console.log('🔍 SERVER - Using existing gallery images:', galleryImagePaths);
          } catch (e2) {
            console.log('Could not parse existing gallery images');
          }
        }
      }
    } else if (existingCar.gallery_images) {
      // No gallery_images in form data, preserve existing ones
      try {
        galleryImagePaths = JSON.parse(existingCar.gallery_images);
        console.log('🔍 SERVER - Preserving existing gallery images:', galleryImagePaths);
      } catch (e) {
        console.log('Could not parse existing gallery images');
      }
    }
    
    // Process new file uploads
    if (req.files && req.files.length > 0) {
      console.log('🔍 SERVER - Processing uploaded files...');
      
      // Create car directory
      const carDir = isVercel 
        ? path.join('/tmp', 'uploads', `car-${id}`)
        : path.join(__dirname, '..', 'uploads', `car-${id}`);
      fs.mkdirSync(carDir, { recursive: true });
      console.log('📁 Created car directory:', carDir);
      
      // Process each uploaded file
      req.files.forEach((file, index) => {
        console.log(`🔍 SERVER - Processing file ${index + 1}:`, file.fieldname, file.originalname);
        
        if (file.fieldname === 'head_image') {
          // Save head image
          const headFileName = `head${path.extname(file.originalname)}`;
          const headFilePath = path.join(carDir, headFileName);
          fs.writeFileSync(headFilePath, file.buffer);
          headImagePath = headFilePath.replace(/\\/g, '/').replace(/.*uploads/, '/uploads');
          console.log('✅ Head image saved:', headImagePath);
        } else if (file.fieldname === 'gallery_images') {
          // Save gallery image
          const galleryFileName = `gallery_${Date.now()}_${index}${path.extname(file.originalname)}`;
          const galleryFilePath = path.join(carDir, galleryFileName);
          fs.writeFileSync(galleryFilePath, file.buffer);
          const galleryImagePath = galleryFilePath.replace(/\\/g, '/').replace(/.*uploads/, '/uploads');
          galleryImagePaths.push(galleryImagePath);
          console.log('✅ Gallery image saved:', galleryImagePath);
        }
      });
    }
    
    // Continue with database update
    const finalHeadImagePath = headImagePath || existingCar.head_image;
    
    const updateParams = [
      make_name,
      model_name,
      production_year,
      gear_type,
      fuel_type,
      engineCapacityValue,
      car_type,
      num_doors,
      num_passengers,
      JSON.stringify(pricePolicyStringified),
      bookedStatus,
      booked_until || null,
      galleryImagePaths.length > 0 ? JSON.stringify(galleryImagePaths) : null,
      luggage || null,
      mileageValue,
      drive || null,
      fuelEconomyValue,
      exterior_color || null,
      interior_color || null,
      rcaInsuranceValue,
      cascoInsuranceValue,
      likesValue,
      descriptionJson,
      finalHeadImagePath, // Use existing head image if no new one uploaded
      id
    ];

    if (isSupabase) {
      try {
        console.log('🔍 Using Supabase for car update');
        
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
          gallery_images: galleryImagePaths.length > 0 ? JSON.stringify(galleryImagePaths) : null,
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
          head_image: finalHeadImagePath
        };
        
        // Remove null/undefined values to avoid Supabase errors
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === null || updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        const { data, error } = await supabase
          .from('cars')
          .update(updateData)
          .eq('id', id)
          .select();
        
        if (error) {
          console.error('❌ Supabase car update error:', error);
          return res.status(500).json({ error: 'Database error: ' + error.message });
        }
        
        if (!data || data.length === 0) {
          return res.status(404).json({ error: 'Car not found' });
        }
        
        console.log('✅ Car updated successfully in Supabase');
        
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
            casco_insurance_price: cascoInsuranceValue
          };
          await telegram.sendMessage(telegram.formatCarUpdatedMessage(carData));
        } catch (error) {
          console.error('Error sending Telegram notification:', error);
        }
        
        res.json({ success: true });
        
      } catch (error) {
        console.error('❌ Supabase car update error:', error);
        res.status(500).json({ error: 'Database error: ' + error.message });
      }
    }
  } catch (error) {
    console.error('❌ Error in car update:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Delete car
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for car deletion');
      
      // First, get the car data to check for images
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', id)
        .single();
      
      if (carError) {
        console.error('❌ Supabase error fetching car for deletion:', carError);
        return res.status(500).json({ error: 'Database error: ' + carError.message });
      }
      
      if (!carData) {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      // Delete the car from Supabase
      const { error: deleteError } = await supabase
        .from('cars')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('❌ Supabase car deletion error:', deleteError);
        return res.status(500).json({ error: 'Database error: ' + deleteError.message });
      }
      
      console.log('✅ Car deleted successfully from Supabase');
      
      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const carDataForTelegram = {
          make_name: carData.make_name,
          model_name: carData.model_name,
          production_year: carData.production_year,
          car_type: carData.car_type
        };
        await telegram.sendMessage(telegram.formatCarDeletedMessage(carDataForTelegram));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
      
      res.json({ success: true, message: 'Car and all associated assets deleted successfully' });
      
    } catch (error) {
      console.error('❌ Supabase car deletion error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
});

// Toggle premium status for a car
router.patch('/:id/premium', async (req, res) => {
  const id = req.params.id;
  const { is_premium } = req.body;
  
  if (typeof is_premium !== 'boolean') {
    return res.status(400).json({ error: 'is_premium must be a boolean value' });
  }
  
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for premium toggle');
      
      const { data, error } = await supabase
        .from('cars')
        .update({ is_premium: is_premium })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('❌ Supabase premium toggle error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      console.log('✅ Premium status updated successfully in Supabase');
      res.json({ 
        success: true, 
        message: `Car ${is_premium ? 'marked as premium' : 'removed from premium'} successfully`,
        is_premium: is_premium
      });
      
    } catch (error) {
      console.error('❌ Supabase premium toggle error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  }
});

// Upload car images
router.post('/:id/images', async (req, res) => {
  const carId = req.params.id;
  
  console.log('🔍 SERVER - POST /api/cars/:id/images received request');
  console.log('  Car ID:', carId);
  console.log('  Request body keys:', Object.keys(req.body || {}));
  console.log('  Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    isVercel: isVercel
  });
  
  try {
    // Check if we're using Supabase
    const isSupabase = true; // Force Supabase usage
    
    let car;
    let headImageUrl = null;
    let galleryImageUrls = [];
    
    if (isSupabase) {
      // Use Supabase
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('head_image, gallery_images')
        .eq('id', carId)
        .single();
      
      if (carError || !carData) {
        console.log('❌ Car not found for ID:', carId);
        return res.status(404).json({ error: 'Car not found' });
      }
      
      car = carData;
      console.log('✅ Car found:', { id: car.id, head_image: car.head_image, gallery_images: car.gallery_images });
      
      // Parse existing gallery images
      galleryImageUrls = car.gallery_images ? JSON.parse(car.gallery_images) : [];
      console.log('📸 Existing gallery images:', galleryImageUrls);
    }
    
    // Process head image if provided
    if (req.body.head_image && req.body.head_image.data) {
      console.log('🖼️ Processing head image upload...');
      try {
        const headImageData = req.body.head_image;

        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(headImageData.data, 'base64');
        
        // Create a file object for Supabase upload
        const headFile = {
          buffer: imageBuffer,
          mimetype: `image/${headImageData.extension || 'jpeg'}`,
          originalname: `head.${headImageData.extension || 'jpg'}`
        };
        
        // Upload to Supabase Storage
        console.log('🖼️ Uploading head image to Supabase Storage...');
        headImagePath = await uploadCarImage(headFile, carId, 'head');
        console.log('✅ Head image uploaded to Supabase:', headImagePath);
      } catch (error) {
        console.error('❌ Error uploading head image to Supabase:', error);
        return res.status(500).json({ error: 'Failed to upload head image: ' + error.message });
      }
    }
    
    // Process gallery images if provided
    if (req.body.gallery_images && Array.isArray(req.body.gallery_images)) {
      console.log('🖼️ Processing gallery images upload...');
      console.log('📊 Gallery images to process:', req.body.gallery_images.length);
      
      for (let index = 0; index < req.body.gallery_images.length; index++) {
        const imageData = req.body.gallery_images[index];
        if (imageData && imageData.data) {
          try {

            // Convert base64 to buffer
            const imageBuffer = Buffer.from(imageData.data, 'base64');
            
            // Create a file object for Supabase upload
            const galleryFile = {
              buffer: imageBuffer,
              mimetype: `image/${imageData.extension || 'jpeg'}`,
              originalname: `gallery_${index}.${imageData.extension || 'jpg'}`
            };
            
            // Upload to Supabase Storage
            console.log(`🖼️ Uploading gallery image ${index + 1} to Supabase Storage...`);
            const galleryImageUrl = await uploadCarImage(galleryFile, carId, 'gallery');
            galleryImagePaths.push(galleryImageUrl);
            console.log('✅ Gallery image uploaded to Supabase:', galleryImageUrl);
          } catch (error) {
            console.error(`❌ Error uploading gallery image ${index + 1}:`, error);
            return res.status(500).json({ error: `Failed to upload gallery image ${index + 1}: ` + error.message });
          }
        }
      }
      
      console.log('📸 Final gallery images count:', galleryImageUrls.length);
      console.log('📸 Final gallery images:', galleryImageUrls);
    }
    
    // Update car with new image URLs
    const updateData = {
      head_image: headImageUrl || car.head_image, // Keep existing if no new upload
      gallery_images: JSON.stringify(galleryImageUrls)
    };
    
    console.log('🔍 Updating car with data:', updateData);
    
    if (isSupabase) {
      // Update in Supabase
      const { error: updateError } = await supabase
        .from('cars')
        .update(updateData)
        .eq('id', carId);
      
      if (updateError) {
        console.error('❌ Supabase error updating car images:', updateError);
        return res.status(500).json({ error: 'Database error: ' + updateError.message });
      }
      
      console.log('✅ Car images updated successfully in Supabase');
    }
    
    res.json({ 
      success: true, 
      head_image: updateData.head_image, 
      gallery_images: galleryImageUrls 
    });
    
  } catch (error) {
    console.error('❌ Car image upload error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Delete a specific image from a car
router.delete('/:id/images', async (req, res) => {
  const carId = req.params.id;
  const imagePath = req.query.path;
  const imageType = req.query.type || 'gallery'; // 'gallery' or 'head'
  
  console.log('DELETE /api/cars/:id/images - Request:', { carId, imagePath, imageType });
  
  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }
  
  try {
    // Get car data from Supabase
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();
    
    if (carError || !car) {
      console.error('Database error in image deletion:', carError);
      return res.status(500).json({ error: 'Database error: ' + (carError?.message || 'Car not found') });
    }
    
    console.log('Car found:', { id: car.id, head_image: car.head_image, gallery_images: car.gallery_images });
    
    let updateData = {};
    
    if (imageType === 'head') {
      // Handle head image deletion
      if (car.head_image !== imagePath) {
        console.log('Head image path mismatch:', { expected: car.head_image, received: imagePath });
        return res.status(400).json({ error: 'Head image path does not match' });
      }
      updateData.head_image = null;
    } else {
      // Handle gallery image deletion
      let galleryImages = [];
      try {
        galleryImages = car.gallery_images ? JSON.parse(car.gallery_images) : [];
        // Ensure it's an array
        if (!Array.isArray(galleryImages)) {
          console.log('Gallery images is not an array, converting:', galleryImages);
          galleryImages = [];
        }
      } catch (e) {
        console.error('Error parsing gallery_images:', e);
        galleryImages = [];
      }
      // Debug logs for troubleshooting
      console.log('Gallery images in DB:', galleryImages);
      console.log('Requested to delete:', imagePath);
      // Check if the image exists in the gallery
      if (!galleryImages.includes(imagePath)) {
        console.log('Image not found in gallery:', imagePath);
        return res.status(400).json({ error: 'Image not found in gallery' });
      }
      // Remove the image from gallery_images array
      const updatedGallery = galleryImages.filter(img => img !== imagePath);
      // Also remove any duplicates that might exist
      const uniqueGallery = [...new Set(updatedGallery)];
      console.log('Updated gallery (after removal):', uniqueGallery);
      updateData.gallery_images = JSON.stringify(uniqueGallery);
    }
    
    console.log('Update data:', updateData);
    
    // Update database first
    const { error: updateError } = await supabase
      .from('cars')
      .update(updateData)
      .eq('id', carId);
    
    if (updateError) {
      console.error('Database error in image deletion update:', updateError);
      return res.status(500).json({ error: 'Database error: ' + updateError.message });
    }
    
    // Delete from Supabase Storage if it's a Supabase URL
    if (imagePath.startsWith('https://lupoqmzqppynyybbvwah.supabase.co')) {
      try {
        // Extract the file path from the Supabase URL
        const url = new URL(imagePath);
        const filePath = url.pathname.replace('/storage/v1/object/public/car-images/', '');
        
        console.log('🗑️ Deleting from Supabase Storage:', filePath);
        
        const { error: deleteError } = await supabaseAdmin.storage
          .from('car-images')
          .remove([filePath]);
        
        if (deleteError) {
          console.error('❌ Error deleting from Supabase Storage:', deleteError);
          // Don't fail the request if storage deletion fails, but log the issue
        } else {
          console.log('✅ Successfully deleted from Supabase Storage:', filePath);
        }
      } catch (error) {
        console.error('❌ Error in Supabase Storage deletion:', error);
        // Don't fail the request if storage deletion fails, but log the issue
      }
    } else {
      // Handle local file deletion (legacy)
      let filePath = imagePath;
      // Handle full URLs - extract just the path part
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const url = new URL(filePath);
        filePath = url.pathname;
      }
      // Remove leading slash if present
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      
      const fullPath = path.join(__dirname, '..', filePath);
      console.log('Attempting to delete local file:', fullPath);
      
      fs.unlink(fullPath, (fileErr) => {
        if (fileErr) {
          console.log(`Warning: Could not delete file ${fullPath}:`, fileErr);
          // Don't fail the request if file deletion fails, but log the issue
        } else {
          console.log(`Successfully deleted file: ${fullPath}`);
        }
      });
    }
    
    // Return success response
    if (imageType === 'head') {
      res.json({ success: true, message: 'Head image deleted successfully' });
    } else {
      // Get updated gallery images for response
      const updatedGallery = JSON.parse(updateData.gallery_images);
      res.json({ success: true, gallery_images: updatedGallery, message: 'Gallery image deleted successfully' });
    }
    
  } catch (error) {
    console.error('Error in image deletion:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Reorder cars endpoint
router.post('/reorder', async (req, res) => {
  const { carOrder } = req.body;
  
  if (!carOrder || !Array.isArray(carOrder)) {
    return res.status(400).json({ error: 'Invalid car order array' });
  }
  
  console.log('Reordering cars:', carOrder);
  
  // Check if we're using Supabase
  const isSupabase = true; // Force Supabase usage
  
  if (isSupabase) {
    try {
      console.log('🔍 Using Supabase for car reordering');
      
      // Update each car's display_order using Supabase
      const updatePromises = carOrder.map((carId, index) => {
        return supabase
          .from('cars')
          .update({ display_order: index })
          .eq('id', carId);
      });
      
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('❌ Supabase reorder errors:', errors);
        return res.status(500).json({ error: 'Failed to update car order in Supabase' });
      }
      
      console.log('✅ Cars reordered successfully in Supabase');
      res.json({ success: true, message: 'Cars reordered successfully' });
      
    } catch (error) {
      console.error('❌ Supabase reorder error:', error);
      res.status(500).json({ error: 'Failed to update car order' });
    }
  }
});

// Check car availability for specific dates
router.get('/:id/availability', async (req, res) => {
  const carId = req.params.id;
  const { pickup_date, return_date } = req.query;
  
  if (!pickup_date || !return_date) {
    return res.status(400).json({ error: 'pickup_date and return_date are required' });
  }
  
  try {
    const availability = await checkCarAvailability(carId, pickup_date, return_date);
    res.json(availability);
  } catch (error) {
    console.error('Error checking car availability:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

module.exports = router; 