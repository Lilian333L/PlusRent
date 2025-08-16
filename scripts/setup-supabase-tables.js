const { Pool } = require('pg');

// Database connection - UPDATE THESE VALUES
const DB_CONFIG = {
  host: 'db.lupoqmzqppynyybbvwah.supabase.co', // UPDATE THIS
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Fva7tNZHS4McfHg8', // UPDATE THIS
  ssl: {
    rejectUnauthorized: false
  }
};

// Alternative: Use connection string
const CONNECTION_STRING = 'postgresql://postgres:Fva7tNZHS4McfHg8@db.lupoqmzqppynyybbvwah.supabase.co:5432/postgres'; // UPDATE THIS

async function setupSupabaseTables() {
  console.log('🔍 Setting up Supabase PostgreSQL tables...');
  
  let pool;
  
  try {
    // Try connection string first, then direct config
    try {
      console.log('📡 Trying connection string...');
      pool = new Pool({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
      });
    } catch (error) {
      console.log('📡 Trying direct configuration...');
      pool = new Pool(DB_CONFIG);
    }

    const client = await pool.connect();
    console.log('✅ Successfully connected to Supabase PostgreSQL!');
    
    const result = await client.query('SELECT NOW()');
    console.log('📅 Current database time:', result.rows[0].now);

    // Create cars table
    console.log('🔧 Creating cars table...');
    await client.query(`
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
        gallery_images TEXT,
        description JSONB,
        luggage VARCHAR(50),
        drive VARCHAR(50),
        air_conditioning BOOLEAN,
        min_age INTEGER,
        deposit DECIMAL(10,2),
        insurance_cost DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'available',
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Cars table created successfully!');

    // Create users table
    console.log('🔧 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created successfully!');

    // Create bookings table
    console.log('🔧 Creating bookings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        car_id INTEGER REFERENCES cars(id),
        user_id INTEGER REFERENCES users(id),
        start_date DATE,
        end_date DATE,
        total_price DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Bookings table created successfully!');

    // Create coupons table
    console.log('🔧 Creating coupons table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        discount_percent INTEGER,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        valid_from DATE,
        valid_until DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Coupons table created successfully!');

    // Create spinning_wheels table
    console.log('🔧 Creating spinning_wheels table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS spinning_wheels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Spinning wheels table created successfully!');

    // List all tables
    console.log('📊 Listing all tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('✅ All tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    client.release();
    await pool.end();
    
    console.log('🎉 Supabase PostgreSQL setup complete!');
    console.log('📋 Next steps:');
    console.log('   1. Update your .env file with the correct connection string');
    console.log('   2. Run the migration script to transfer data from SQLite');
    console.log('   3. Deploy to Vercel');
    
  } catch (error) {
    console.error('❌ Error setting up Supabase tables:', error.message);
    console.error('Full error:', error);
    console.log('\n🔧 Please check:');
    console.log('   1. Your connection string is correct');
    console.log('   2. Your Supabase project is active');
    console.log('   3. Your database password is correct');
  }
}

setupSupabaseTables(); 