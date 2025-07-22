const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// SQLite DB setup
const db = new sqlite3.Database('./carrental.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  // Create new cars table with updated fields and booked status
  db.run(`CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make_name TEXT,
    model_name TEXT,
    production_year INTEGER,
    gear_type TEXT,
    fuel_type TEXT,
    engine_capacity REAL NULL,
    car_type TEXT,
    num_doors INTEGER,
    num_passengers INTEGER,
    price_policy TEXT,
    booked INTEGER DEFAULT 0,
    booked_until TEXT
  )`);
});

// Update cars table to include head_image and gallery_images if not present
// (This is a safe migration for SQLite)
db.serialize(() => {
  db.run(`ALTER TABLE cars ADD COLUMN head_image TEXT`, () => {});
  db.run(`ALTER TABLE cars ADD COLUMN gallery_images TEXT`, () => {});
  db.run(`ALTER TABLE cars ADD COLUMN booked_until TEXT`, () => {});
  
  // Migration to update engine_capacity column type from INTEGER to REAL
  db.get(`PRAGMA table_info(cars)`, (err, info) => {
    if (err) {
      console.log('Migration warning: Could not check table info:', err);
      return;
    }
    
    // Check if we need to migrate the engine_capacity column
    db.all(`PRAGMA table_info(cars)`, [], (err, columns) => {
      if (err) {
        console.log('Migration warning: Could not check columns:', err);
        return;
      }
      
      const engineCapacityColumn = columns.find(col => col.name === 'engine_capacity');
      
      if (engineCapacityColumn && engineCapacityColumn.type === 'INTEGER') {
        console.log('Migrating engine_capacity from INTEGER to REAL...');
        
        // Create new table with REAL engine_capacity
        db.run(`CREATE TABLE cars_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          make_name TEXT,
          model_name TEXT,
          production_year INTEGER,
          gear_type TEXT,
          fuel_type TEXT,
          engine_capacity REAL NULL,
          car_type TEXT,
          num_doors INTEGER,
          num_passengers INTEGER,
          price_policy TEXT,
          booked INTEGER DEFAULT 0,
          booked_until TEXT,
          head_image TEXT,
          gallery_images TEXT
        )`, (err) => {
          if (err) {
            console.log('Migration error: Could not create new table:', err);
            return;
          }
          
          // Copy data from old table to new table
          db.run(`INSERT INTO cars_new (id, make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, booked, booked_until, head_image, gallery_images)
                  SELECT id, make_name, model_name, production_year, gear_type, fuel_type, CAST(engine_capacity AS REAL), car_type, num_doors, num_passengers, price_policy, booked, booked_until, head_image, gallery_images
                  FROM cars`, (err) => {
            if (err) {
              console.log('Migration error: Could not copy data:', err);
              return;
            }
            
            // Drop old table
            db.run(`DROP TABLE cars`, (err) => {
              if (err) {
                console.log('Migration error: Could not drop old table:', err);
                return;
              }
              
              // Rename new table to cars
              db.run(`ALTER TABLE cars_new RENAME TO cars`, (err) => {
                if (err) {
                  console.log('Migration error: Could not rename table:', err);
                  return;
                }
                
                console.log('Migration completed: Engine capacity now accepts decimal values');
              });
            });
          });
        });
      } else {
        console.log('Migration completed: Engine capacity already supports decimal values');
      }
    });
  });
});

// Multer storage config for car images
const carImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const carId = req.params.id;
    const dir = path.join(__dirname, 'uploads', `car-${carId}`);
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

// Endpoint to get a single car by ID
app.get('/api/cars/:id', (req, res) => {
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

// Endpoint to add a new car
app.post('/api/cars', async (req, res) => {
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
    booked_until
  } = req.body;

  // For electric cars, engine_capacity can be null
  const isElectric = fuel_type === 'Electric';

  if (
    !make_name ||
    !model_name ||
    !production_year ||
    !gear_type ||
    !fuel_type ||
    (!isElectric && !engine_capacity) ||
    !car_type ||
    !num_doors ||
    !num_passengers ||
    !price_policy
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
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

  // Convert all price_policy values to strings
  const pricePolicyStringified = {};
  for (const key in price_policy) {
    pricePolicyStringified[key] = String(price_policy[key]);
  }

  // Store in DB, booked defaults to 0
  db.run(
    `INSERT INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, booked, booked_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)` ,
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
      booked_until || null
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Endpoint to get all cars
app.get('/api/cars', (req, res) => {
  db.all('SELECT * FROM cars', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    // Parse price_policy JSON for each car and check availability
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    const cars = rows.map(car => {
      let isAvailable = true;
      let bookedUntilDate = null;
      
      // Check if car has a booked_until date
      if (car.booked_until) {
        bookedUntilDate = new Date(car.booked_until);
        bookedUntilDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
        
        // If current date is before or equal to booked_until date, car is not available
        if (currentDate <= bookedUntilDate) {
          isAvailable = false;
        }
      }
      
      return {
        ...car,
        price_policy: car.price_policy ? JSON.parse(car.price_policy) : {},
        booked: isAvailable ? 0 : 1, // Override booked status based on date check
        booked_until: car.booked_until,
        is_available: isAvailable
      };
    });
    res.json(cars);
  });
});

// Endpoint to update a car
app.put('/api/cars/:id', (req, res) => {
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
    gallery_images
  } = req.body;

  // For electric cars, engine_capacity can be null
  const isElectric = fuel_type === 'Electric';

  if (
    !make_name ||
    !model_name ||
    !production_year ||
    !gear_type ||
    !fuel_type ||
    (!isElectric && !engine_capacity) ||
    !car_type ||
    !num_doors ||
    !num_passengers ||
    !price_policy
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
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

  const pricePolicyStringified = {};
  for (const key in price_policy) {
    pricePolicyStringified[key] = String(price_policy[key]);
  }

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

  db.run(
    `UPDATE cars SET make_name=?, model_name=?, production_year=?, gear_type=?, fuel_type=?, engine_capacity=?, car_type=?, num_doors=?, num_passengers=?, price_policy=?, booked=?, booked_until=?, gallery_images=? WHERE id=?`,
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
      bookedStatus,
      booked_until || null,
      gallery_images ? JSON.stringify(gallery_images) : null,
      id
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// Add DELETE endpoint for deleting a car by id
app.delete('/api/cars/:id', (req, res) => {
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
    db.run('DELETE FROM cars WHERE id = ?', [id], function (dbErr) {
      if (dbErr) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Only after successful database deletion, delete all associated files and directory
      const carDir = path.join(__dirname, 'uploads', `car-${id}`);
      
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

// Upload images for a car (head_image and gallery_images[])
app.post('/api/cars/:id/images', upload.fields([
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
    }
    db.run('UPDATE cars SET head_image=?, gallery_images=? WHERE id=?', [newHead, JSON.stringify(newGallery), carId], function (err2) {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, head_image: newHead, gallery_images: newGallery });
    });
  });
});

// Delete a specific image from a car
app.delete('/api/cars/:id/images', (req, res) => {
  const carId = req.params.id;
  const imagePath = req.query.path;
  const imageType = req.query.type || 'gallery'; // 'gallery' or 'head'
  
  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }
  
  db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
    if (err || !car) return res.status(404).json({ error: 'Car not found' });
    
    let updateQuery = '';
    let updateParams = [];
    
    if (imageType === 'head') {
      // Handle head image deletion
      if (car.head_image !== imagePath) {
        return res.status(400).json({ error: 'Head image path does not match' });
      }
      updateQuery = 'UPDATE cars SET head_image=NULL WHERE id=?';
      updateParams = [carId];
    } else {
      // Handle gallery image deletion
      let galleryImages = [];
      try {
        galleryImages = car.gallery_images ? JSON.parse(car.gallery_images) : [];
      } catch (e) {
        galleryImages = [];
      }
      
      // Check if the image exists in the gallery
      if (!galleryImages.includes(imagePath)) {
        return res.status(400).json({ error: 'Image not found in gallery' });
      }
      
      // Remove the image from gallery_images array
      const updatedGallery = galleryImages.filter(img => img !== imagePath);
      updateQuery = 'UPDATE cars SET gallery_images=? WHERE id=?';
      updateParams = [JSON.stringify(updatedGallery), carId];
    }
    
    // Update database first
    db.run(updateQuery, updateParams, function (err2) {
      if (err2) {
        return res.status(500).json({ error: 'Database error' });
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
      
      const fullPath = path.join(__dirname, filePath);
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 