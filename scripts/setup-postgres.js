const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    console.log('🔄 Setting up PostgreSQL database...');

    // Create cars table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        make_name VARCHAR(100),
        model_name VARCHAR(100),
        production_year INTEGER,
        gear_type VARCHAR(50),
        fuel_type VARCHAR(50),
        engine_capacity DECIMAL(3,1),
        car_type VARCHAR(50),
        num_doors INTEGER,
        num_passengers INTEGER,
        price_policy JSONB,
        booked BOOLEAN DEFAULT FALSE,
        booked_until DATE,
        head_image TEXT,
        gallery_images JSONB DEFAULT '[]',
        luggage VARCHAR(100),
        mileage INTEGER,
        drive VARCHAR(100),
        fuel_economy DECIMAL(5,2),
        exterior_color VARCHAR(50),
        interior_color VARCHAR(50),
        rca_insurance_price DECIMAL(8,2),
        casco_insurance_price DECIMAL(8,2),
        is_premium BOOLEAN DEFAULT FALSE,
        likes INTEGER DEFAULT 0,
        description JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create admin users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create coupon codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupon_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'percentage',
        discount_percentage INTEGER,
        free_days INTEGER,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        available_codes JSONB DEFAULT '[]',
        showed_codes JSONB DEFAULT '[]'
      )
    `);

    // Create spinning wheels table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spinning_wheels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL,
        pickup_date DATE NOT NULL,
        pickup_time TIME NOT NULL,
        return_date DATE NOT NULL,
        return_time TIME NOT NULL,
        discount_code VARCHAR(50),
        insurance_type VARCHAR(50) NOT NULL,
        pickup_location TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        contact_person VARCHAR(100),
        contact_phone VARCHAR(20),
        special_instructions TEXT,
        total_price DECIMAL(10,2) NOT NULL,
        price_breakdown JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create booked_cars table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booked_cars (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL,
        booking_id INTEGER NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        pickup_date DATE NOT NULL,
        pickup_time TIME NOT NULL,
        return_date DATE NOT NULL,
        return_time TIME NOT NULL,
        insurance_type VARCHAR(50) NOT NULL,
        pickup_location TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create wheel_coupons junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wheel_coupons (
        id SERIAL PRIMARY KEY,
        wheel_id INTEGER NOT NULL,
        coupon_id INTEGER NOT NULL,
        percentage DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(wheel_id, coupon_id)
      )
    `);

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make_name, model_name)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cars_car_type ON cars(car_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cars_is_premium ON cars(is_premium)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_booked_cars_car_id ON booked_cars(car_id)');

    console.log('✅ PostgreSQL database setup completed successfully!');
    
    // Insert default admin user if not exists
    const adminCheck = await pool.query('SELECT id FROM admin_users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admin_users (username, password_hash, email) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'admin@rentaly.com']
      );
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase; 