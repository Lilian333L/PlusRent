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
    engine_capacity INTEGER,
    car_type TEXT,
    num_doors INTEGER,
    num_passengers INTEGER,
    price_policy TEXT,
    booked INTEGER DEFAULT 0
  )`);
});

// Update cars table to include head_image and gallery_images if not present
// (This is a safe migration for SQLite)
db.serialize(() => {
  db.run(`ALTER TABLE cars ADD COLUMN head_image TEXT`, () => {});
  db.run(`ALTER TABLE cars ADD COLUMN gallery_images TEXT`, () => {});
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
    price_policy
  } = req.body;

  if (
    !make_name ||
    !model_name ||
    !production_year ||
    !gear_type ||
    !fuel_type ||
    !engine_capacity ||
    !car_type ||
    !num_doors ||
    !num_passengers ||
    !price_policy
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Convert all price_policy values to strings
  const pricePolicyStringified = {};
  for (const key in price_policy) {
    pricePolicyStringified[key] = String(price_policy[key]);
  }

  // Store in DB, booked defaults to 0
  db.run(
    `INSERT INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, booked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)` ,
    [
      make_name,
      model_name,
      production_year,
      gear_type,
      fuel_type,
      engine_capacity,
      car_type,
      num_doors,
      num_passengers,
      JSON.stringify(pricePolicyStringified)
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
    // Parse price_policy JSON for each car
    const cars = rows.map(car => ({
      ...car,
      price_policy: car.price_policy ? JSON.parse(car.price_policy) : {}
    }));
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
    booked
  } = req.body;

  if (
    !make_name ||
    !model_name ||
    !production_year ||
    !gear_type ||
    !fuel_type ||
    !engine_capacity ||
    !car_type ||
    !num_doors ||
    !num_passengers ||
    !price_policy ||
    typeof booked === 'undefined'
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pricePolicyStringified = {};
  for (const key in price_policy) {
    pricePolicyStringified[key] = String(price_policy[key]);
  }

  db.run(
    `UPDATE cars SET make_name=?, model_name=?, production_year=?, gear_type=?, fuel_type=?, engine_capacity=?, car_type=?, num_doors=?, num_passengers=?, price_policy=?, booked=? WHERE id=?`,
    [
      make_name,
      model_name,
      production_year,
      gear_type,
      fuel_type,
      engine_capacity,
      car_type,
      num_doors,
      num_passengers,
      JSON.stringify(pricePolicyStringified),
      booked ? 1 : 0,
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
  db.run('DELETE FROM cars WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json({ success: true });
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
  
  db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
    if (err || !car) return res.status(404).json({ error: 'Car not found' });
    
    let galleryImages = [];
    try {
      galleryImages = car.gallery_images ? JSON.parse(car.gallery_images) : [];
    } catch (e) {
      galleryImages = [];
    }
    
    // Remove the image from gallery_images array
    const updatedGallery = galleryImages.filter(img => img !== imagePath);
    
    // Delete the actual file from filesystem
    const fullPath = path.join(__dirname, imagePath);
    fs.unlink(fullPath, (err) => {
      if (err) console.log('Could not delete file:', err);
    });
    
    // Update database
    db.run('UPDATE cars SET gallery_images=? WHERE id=?', [JSON.stringify(updatedGallery), carId], function (err2) {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, gallery_images: updatedGallery });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 