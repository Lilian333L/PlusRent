CREATE TABLE cars (
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
      gallery_images TEXT,
      luggage TEXT,
      mileage INTEGER,
      drive TEXT,
      fuel_economy REAL,
      exterior_color TEXT,
      interior_color TEXT,
      rca_insurance_price REAL,
      casco_insurance_price REAL
    , is_premium BOOLEAN DEFAULT 0, likes INTEGER DEFAULT 0, display_order INTEGER DEFAULT 0, description TEXT DEFAULT '{}');
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      pickup_date TEXT NOT NULL,
      pickup_time TEXT NOT NULL,
      return_date TEXT NOT NULL,
      return_time TEXT NOT NULL,
      discount_code TEXT,
      insurance_type TEXT NOT NULL,
      pickup_location TEXT NOT NULL,
      dropoff_location TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      special_instructions TEXT,
      total_price REAL NOT NULL,
      price_breakdown TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars (id)
    );
CREATE TABLE booked_cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      booking_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      pickup_time TEXT NOT NULL,
      return_date TEXT NOT NULL,
      return_time TEXT NOT NULL,
      insurance_type TEXT NOT NULL,
      pickup_location TEXT NOT NULL,
      dropoff_location TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars (id),
      FOREIGN KEY (booking_id) REFERENCES bookings (id)
    );
CREATE TABLE wheel_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wheel_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, percentage REAL DEFAULT 0,
      FOREIGN KEY (wheel_id) REFERENCES spinning_wheels (id) ON DELETE CASCADE,
      FOREIGN KEY (coupon_id) REFERENCES coupon_codes (id) ON DELETE CASCADE,
      UNIQUE(wheel_id, coupon_id)
    );
CREATE TABLE IF NOT EXISTS "coupon_codes" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'percentage',
      discount_percentage INTEGER,
      description TEXT,
      expires_at DATETIME DEFAULT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      wheel_enabled BOOLEAN DEFAULT 0
    , free_days INTEGER, available_codes TEXT DEFAULT '[]', showed_codes TEXT DEFAULT '[]');
CREATE TABLE IF NOT EXISTS "spinning_wheels" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
