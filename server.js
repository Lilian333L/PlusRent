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
  // Drop old cars table if exists
  db.run('DROP TABLE IF EXISTS cars');
  // Create new cars table with reordered columns and price_policy as string values
  db.run(`CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make_name TEXT,
    model_name TEXT,
    production_year INTEGER,
    gear_type TEXT,
    fuel_type TEXT,
    engine_capacity REAL,
    car_type TEXT,
    num_doors INTEGER,
    num_passengers INTEGER,
    price_policy TEXT
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

  // Store in DB
  db.run(
    `INSERT INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 