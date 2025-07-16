const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 