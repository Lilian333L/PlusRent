const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');
const TelegramNotifier = require('../config/telegram');

// Multer storage config for initial car creation (temporary storage)
const tempImageStorage = multer.diskStorage({
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
const carImageStorage = multer.diskStorage({
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

const upload = multer({ storage: carImageStorage });
const tempUpload = multer({ storage: tempImageStorage });

// Get all cars with filtering
router.get('/', (req, res) => {
  const filters = [];
  const params = [];

  // Helper to add single or multi-value filter (case-insensitive)
  function addFilter(field, param) {
    if (req.query[param] && req.query[param] !== '') {
      const values = req.query[param].split(',').map(v => v.trim()).filter(Boolean);
      if (values.length > 1) {
        filters.push(`${field} IN (${values.map(() => '?').join(',')}) COLLATE NOCASE`);
        params.push(...values);
      } else {
        filters.push(`${field} = ? COLLATE NOCASE`);
        params.push(values[0]);
      }
    }
  }

  addFilter('make_name', 'make_name');
  addFilter('model_name', 'model_name');
  addFilter('gear_type', 'gear_type');
  addFilter('fuel_type', 'fuel_type');
  addFilter('car_type', 'car_type');
  addFilter('num_doors', 'num_doors');
  addFilter('num_passengers', 'num_passengers');

  if (req.query.min_year && req.query.min_year !== '') {
    filters.push('production_year >= ?');
    params.push(req.query.min_year);
  }
  if (req.query.max_year && req.query.max_year !== '') {
    filters.push('production_year <= ?');
    params.push(req.query.max_year);
  }
  // Price filtering (by daily rate for 1-2 days)
  if (req.query.min_price && req.query.min_price !== '') {
    filters.push("(CAST(json_extract(price_policy, '$.1-2') AS INTEGER) >= ?)");
    params.push(req.query.min_price);
  }
  if (req.query.max_price && req.query.max_price !== '') {
    filters.push("(CAST(json_extract(price_policy, '$.1-2') AS INTEGER) <= ?)");
    params.push(req.query.max_price);
  }

  let sql = 'SELECT * FROM cars';
  if (filters.length > 0) {
    sql += ' WHERE ' + filters.join(' AND ');
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    // Parse price_policy and gallery_images for each car
    rows.forEach(car => {
      car.price_policy = car.price_policy ? JSON.parse(car.price_policy) : {};
      car.gallery_images = car.gallery_images ? JSON.parse(car.gallery_images) : [];
    });
    res.json(rows);
  });
});

// Get cars for booking form (only available cars with basic info)
router.get('/booking/available', (req, res) => {
  const sql = `
    SELECT id, make_name, model_name, production_year, head_image, price_policy, booked, 
           car_type, num_doors, num_passengers, fuel_type, gear_type
    FROM cars 
    WHERE booked = 0 OR booked IS NULL
    ORDER BY make_name, model_name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse price_policy for each car and format for display
    const cars = rows.map(car => {
      const pricePolicy = car.price_policy ? JSON.parse(car.price_policy) : {};
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
        data_src: car.head_image ? `${req.protocol}://${req.get('host')}${car.head_image}` : `images/cars-alt/${car.make_name.toLowerCase()}-${car.model_name.toLowerCase().replace(/\s+/g, '-')}.png`
      };
    });
    
    res.json(cars);
  });
});

// Get single car by ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM cars WHERE id = ?', [id], (err, car) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    car.price_policy = car.price_policy ? JSON.parse(car.price_policy) : {};
    car.gallery_images = car.gallery_images ? JSON.parse(car.gallery_images) : [];
    res.json(car);
  });
});

// Add new car
router.post('/', tempUpload.any(), async (req, res) => {
  console.log('Car creation request body:', req.body);
  console.log('Files received:', req.files);
  
  // Handle file uploads (temporary files)
  let headImagePath = null;
  let galleryImagePaths = [];
  
  if (req.files && req.files.length > 0) {
    console.log('🔍 Processing uploaded files:');
    req.files.forEach(file => {
      console.log(`  File: ${file.fieldname} - ${file.originalname} - ${file.path}`);
      if (file.fieldname === 'head_image') {
        headImagePath = file.path; // Keep full path for now
        console.log('✅ Head image found:', file.path);
      } else if (file.fieldname === 'gallery_images') {
        galleryImagePaths.push(file.path); // Keep full path for now
        console.log('✅ Gallery image found:', file.path);
      } else {
        console.log('⚠️ Unknown file fieldname:', file.fieldname);
      }
    });
    console.log('📊 Summary:');
    console.log('  Head image path:', headImagePath);
    console.log('  Gallery image paths:', galleryImagePaths);
  } else {
    console.log('⚠️ No files received in request');
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
    casco_insurance_price
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
    num_passengers: 'Number of Passengers',
    rca_insurance_price: 'RCA Insurance Price',
    casco_insurance_price: 'Casco Insurance Price'
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
  const rcaInsuranceValue = parseFloat(rca_insurance_price);
  const cascoInsuranceValue = parseFloat(casco_insurance_price);

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
    cascoInsuranceValue
  });
  
  db.run(
    `INSERT INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, booked, booked_until, luggage, mileage, drive, fuel_economy, exterior_color, interior_color, rca_insurance_price, casco_insurance_price, head_image, gallery_images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
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
      

      // const carId = this.lastID;
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
      
      // Move files from temp to proper car directory
      if (headImagePath || galleryImagePaths.length > 0) {
        const carDir = path.join(__dirname, '..', 'uploads', `car-${carId}`);
        console.log('📁 Creating car directory:', carDir);
        fs.mkdirSync(carDir, { recursive: true });
        
        let finalHeadImagePath = null;
        let finalGalleryImagePaths = [];
        
        if (headImagePath) {
          const headFileName = path.basename(headImagePath);
          const finalHeadPath = path.join(carDir, headFileName);
          console.log('🖼️ Moving head image from', headImagePath, 'to', finalHeadPath);
          fs.renameSync(headImagePath, finalHeadPath);
          finalHeadImagePath = finalHeadPath.replace(/\\/g, '/').replace(/.*uploads/, '/uploads');
          console.log('✅ Head image moved successfully');
        }
        
        galleryImagePaths.forEach((galleryPath, index) => {
          const galleryFileName = path.basename(galleryPath);
          const finalGalleryPath = path.join(carDir, galleryFileName);
          console.log(`🖼️ Moving gallery image ${index + 1} from`, galleryPath, 'to', finalGalleryPath);
          fs.renameSync(galleryPath, finalGalleryPath);
          finalGalleryImagePaths.push(finalGalleryPath.replace(/\\/g, '/').replace(/.*uploads/, '/uploads'));
          console.log(`✅ Gallery image ${index + 1} moved successfully`);
        });
        
        // Update database with final image paths
        const updateSql = `UPDATE cars SET head_image = ?, gallery_images = ? WHERE id = ?`;
        console.log('🖼️ Updating database with image paths:');
        console.log('  Head image:', finalHeadImagePath);
        console.log('  Gallery images:', finalGalleryImagePaths);
        console.log('  Car ID:', carId);
        
        console.log('🔍 About to execute database update with:');
        console.log('  SQL:', updateSql);
        console.log('  Parameters:', [finalHeadImagePath, JSON.stringify(finalGalleryImagePaths), carId]);
        
        db.run(updateSql, [
          finalHeadImagePath,
          JSON.stringify(finalGalleryImagePaths),
          carId
        ], (updateErr) => {
          if (updateErr) {
            console.error('❌ Error updating image paths:', updateErr);
          } else {
            console.log('✅ Image paths updated successfully in database');
            console.log('  Updated car ID:', carId);
            console.log('  Final head image path:', finalHeadImagePath);
            console.log('  Final gallery image paths:', finalGalleryImagePaths);
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
});

// Update car
router.put('/:id', (req, res) => {
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
    price_policy,
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
    casco_insurance_price
  } = req.body;

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
    num_passengers: 'Number of Passengers',
    rca_insurance_price: 'RCA Insurance Price',
    casco_insurance_price: 'Casco Insurance Price'
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
  const rcaInsuranceValue = parseFloat(rca_insurance_price);
  const cascoInsuranceValue = parseFloat(casco_insurance_price);

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
    gallery_images ? JSON.stringify(gallery_images) : null,
    luggage || null,
    mileageValue,
    drive || null,
    fuelEconomyValue,
    exterior_color || null,
    interior_color || null,
    rcaInsuranceValue,
    cascoInsuranceValue,
    id
  ];

  db.run(
    `UPDATE cars SET make_name=?, model_name=?, production_year=?, gear_type=?, fuel_type=?, engine_capacity=?, car_type=?, num_doors=?, num_passengers=?, price_policy=?, booked=?, booked_until=?, gallery_images=?, luggage=?, mileage=?, drive=?, fuel_economy=?, exterior_color=?, interior_color=?, rca_insurance_price=?, casco_insurance_price=? WHERE id=?`,
    updateParams,
    async function (err) {
      if (err) {
        console.error('Database error in PUT /api/cars/:id:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
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
        await telegram.sendMessage(telegram.formatCarUpdatedMessage(carData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
      res.json({ success: true });
    }
  );
});

// Delete car
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  
  // First, get the car data to check for images
  db.get('SELECT * FROM cars WHERE id = ?', [id], (err, car) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    // Delete the car from database first
    db.run('DELETE FROM cars WHERE id = ?', [id], async function (dbErr) {
      if (dbErr) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Send Telegram notification
      try {
        const telegram = new TelegramNotifier();
        const carData = {
          make_name: car.make_name,
          model_name: car.model_name,
          production_year: car.production_year,
          car_type: car.car_type
        };
        await telegram.sendMessage(telegram.formatCarDeletedMessage(carData));
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
      }
      
      // Only after successful database deletion, delete all associated files and directory
      const carDir = path.join(__dirname, '..', 'uploads', `car-${id}`);
      
      // Remove the entire car directory and all its contents
      fs.rm(carDir, { recursive: true, force: true }, (fsErr) => {
        if (fsErr) {
          console.log(`Warning: Could not delete car directory ${carDir}:`, fsErr);
          // Don't fail the request if file deletion fails, but log the issue
        } else {
          console.log(`Successfully deleted car directory: ${carDir}`);
        }
      });
      
      res.json({ success: true, message: 'Car and all associated assets deleted successfully' });
    });
  });
});

// Upload images for a car
router.post('/:id/images', upload.fields([
  { name: 'head_image', maxCount: 1 },
  { name: 'gallery_images', maxCount: 10 }
]), (req, res) => {
  const carId = req.params.id;
  const headImage = req.files['head_image'] ? req.files['head_image'][0].filename : null;
  const galleryImages = req.files['gallery_images'] ? req.files['gallery_images'].map(f => f.filename) : [];

  // Update DB with new image filenames
  db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
    if (err || !car) return res.status(404).json({ error: 'Car not found' });
    let newHead = headImage ? `/uploads/car-${carId}/${headImage}` : car.head_image;
    let newGallery = car.gallery_images ? JSON.parse(car.gallery_images) : [];
    if (galleryImages.length > 0) {
      newGallery = [...newGallery, ...galleryImages.map(f => `/uploads/car-${carId}/${f}`)].slice(0, 10);
      // Remove duplicates
      newGallery = [...new Set(newGallery)];
    }
    db.run('UPDATE cars SET head_image=?, gallery_images=? WHERE id=?', [newHead, JSON.stringify(newGallery), carId], function (err2) {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, head_image: newHead, gallery_images: newGallery });
    });
  });
});

// Delete a specific image from a car
router.delete('/:id/images', (req, res) => {
  const carId = req.params.id;
  const imagePath = req.query.path;
  const imageType = req.query.type || 'gallery'; // 'gallery' or 'head'
  
  console.log('DELETE /api/cars/:id/images - Request:', { carId, imagePath, imageType });
  
  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }
  
  db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
    if (err) {
      console.error('Database error in image deletion:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    console.log('Car found:', { id: car.id, head_image: car.head_image, gallery_images: car.gallery_images });
    
    let updateQuery = '';
    let updateParams = [];
    
    if (imageType === 'head') {
      // Handle head image deletion
      if (car.head_image !== imagePath) {
        console.log('Head image path mismatch:', { expected: car.head_image, received: imagePath });
        return res.status(400).json({ error: 'Head image path does not match' });
      }
      updateQuery = 'UPDATE cars SET head_image=NULL WHERE id=?';
      updateParams = [carId];
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
      updateQuery = 'UPDATE cars SET gallery_images=? WHERE id=?';
      updateParams = [JSON.stringify(uniqueGallery), carId];
    }
    
    console.log('Update query:', updateQuery);
    console.log('Update params:', updateParams);
    
    // Update database first
    db.run(updateQuery, updateParams, function (err2) {
      if (err2) {
        console.error('Database error in image deletion update:', err2);
        return res.status(500).json({ error: 'Database error: ' + err2.message });
      }
      
      // Only after successful database update, delete the actual file from filesystem
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
      console.log('Attempting to delete file:', fullPath);
      
      fs.unlink(fullPath, (fileErr) => {
        if (fileErr) {
          console.log(`Warning: Could not delete file ${fullPath}:`, fileErr);
          // Don't fail the request if file deletion fails, but log the issue
        } else {
          console.log(`Successfully deleted file: ${fullPath}`);
        }
      });
      
      // Return success response
      if (imageType === 'head') {
        res.json({ success: true, message: 'Head image deleted successfully' });
      } else {
        // Get updated gallery images for response
        const updatedGallery = JSON.parse(updateParams[0]);
        res.json({ success: true, gallery_images: updatedGallery, message: 'Gallery image deleted successfully' });
      }
    });
  });
});

module.exports = router; 