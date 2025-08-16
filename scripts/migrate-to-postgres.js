const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// SQLite connection
const sqliteDb = new sqlite3.Database('./carrental.db');

// PostgreSQL connection
const pgPool = new Pool({
  connectionString: process.env.SUPABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateData() {
  try {
    console.log('🔄 Starting data migration from SQLite to PostgreSQL...');

    // Migrate cars
    console.log('📦 Migrating cars...');
    const cars = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM cars', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const car of cars) {
      await pgPool.query(`
        INSERT INTO cars (
          id, make_name, model_name, production_year, gear_type, fuel_type,
          engine_capacity, car_type, num_doors, num_passengers, price_policy,
          booked, booked_until, head_image, gallery_images, luggage, mileage,
          drive, fuel_economy, exterior_color, interior_color,
          rca_insurance_price, casco_insurance_price, is_premium, likes, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        ON CONFLICT (id) DO UPDATE SET
          make_name = EXCLUDED.make_name,
          model_name = EXCLUDED.model_name,
          production_year = EXCLUDED.production_year,
          gear_type = EXCLUDED.gear_type,
          fuel_type = EXCLUDED.fuel_type,
          engine_capacity = EXCLUDED.engine_capacity,
          car_type = EXCLUDED.car_type,
          num_doors = EXCLUDED.num_doors,
          num_passengers = EXCLUDED.num_passengers,
          price_policy = EXCLUDED.price_policy,
          booked = EXCLUDED.booked,
          booked_until = EXCLUDED.booked_until,
          head_image = EXCLUDED.head_image,
          gallery_images = EXCLUDED.gallery_images,
          luggage = EXCLUDED.luggage,
          mileage = EXCLUDED.mileage,
          drive = EXCLUDED.drive,
          fuel_economy = EXCLUDED.fuel_economy,
          exterior_color = EXCLUDED.exterior_color,
          interior_color = EXCLUDED.interior_color,
          rca_insurance_price = EXCLUDED.rca_insurance_price,
          casco_insurance_price = EXCLUDED.casco_insurance_price,
          is_premium = EXCLUDED.is_premium,
          likes = EXCLUDED.likes,
          description = EXCLUDED.description
      `, [
        car.id, car.make_name, car.model_name, car.production_year, car.gear_type,
        car.fuel_type, car.engine_capacity, car.car_type, car.num_doors,
        car.num_passengers, car.price_policy, car.booked, car.booked_until,
        car.head_image, car.gallery_images, car.luggage, car.mileage, car.drive,
        car.fuel_economy, car.exterior_color, car.interior_color,
        car.rca_insurance_price, car.casco_insurance_price, car.is_premium,
        car.likes, car.description
      ]);
    }
    console.log(`✅ Migrated ${cars.length} cars`);

    // Migrate admin users
    console.log('👤 Migrating admin users...');
    const adminUsers = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM admin_users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const user of adminUsers) {
      await pgPool.query(`
        INSERT INTO admin_users (id, username, password_hash, email, created_at, last_login)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          email = EXCLUDED.email,
          last_login = EXCLUDED.last_login
      `, [user.id, user.username, user.password_hash, user.email, user.created_at, user.last_login]);
    }
    console.log(`✅ Migrated ${adminUsers.length} admin users`);

    // Migrate coupon codes
    console.log('🎫 Migrating coupon codes...');
    const coupons = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM coupon_codes', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const coupon of coupons) {
      await pgPool.query(`
        INSERT INTO coupon_codes (
          id, code, type, discount_percentage, free_days, max_uses, current_uses,
          valid_from, valid_until, is_active, created_at, available_codes, showed_codes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          type = EXCLUDED.type,
          discount_percentage = EXCLUDED.discount_percentage,
          free_days = EXCLUDED.free_days,
          max_uses = EXCLUDED.max_uses,
          current_uses = EXCLUDED.current_uses,
          valid_from = EXCLUDED.valid_from,
          valid_until = EXCLUDED.valid_until,
          is_active = EXCLUDED.is_active,
          available_codes = EXCLUDED.available_codes,
          showed_codes = EXCLUDED.showed_codes
      `, [
        coupon.id, coupon.code, coupon.type, coupon.discount_percentage,
        coupon.free_days, coupon.max_uses, coupon.current_uses, coupon.valid_from,
        coupon.valid_until, coupon.is_active, coupon.created_at,
        coupon.available_codes, coupon.showed_codes
      ]);
    }
    console.log(`✅ Migrated ${coupons.length} coupon codes`);

    // Migrate spinning wheels
    console.log('🎡 Migrating spinning wheels...');
    const wheels = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM spinning_wheels', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const wheel of wheels) {
      await pgPool.query(`
        INSERT INTO spinning_wheels (id, name, description, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active
      `, [wheel.id, wheel.name, wheel.description, wheel.is_active, wheel.created_at]);
    }
    console.log(`✅ Migrated ${wheels.length} spinning wheels`);

    // Migrate bookings
    console.log('📅 Migrating bookings...');
    const bookings = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM bookings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const booking of bookings) {
      await pgPool.query(`
        INSERT INTO bookings (
          id, car_id, pickup_date, pickup_time, return_date, return_time,
          discount_code, insurance_type, pickup_location, dropoff_location,
          contact_person, contact_phone, special_instructions, total_price,
          price_breakdown, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          car_id = EXCLUDED.car_id,
          pickup_date = EXCLUDED.pickup_date,
          pickup_time = EXCLUDED.pickup_time,
          return_date = EXCLUDED.return_date,
          return_time = EXCLUDED.return_time,
          discount_code = EXCLUDED.discount_code,
          insurance_type = EXCLUDED.insurance_type,
          pickup_location = EXCLUDED.pickup_location,
          dropoff_location = EXCLUDED.dropoff_location,
          contact_person = EXCLUDED.contact_person,
          contact_phone = EXCLUDED.contact_phone,
          special_instructions = EXCLUDED.special_instructions,
          total_price = EXCLUDED.total_price,
          price_breakdown = EXCLUDED.price_breakdown,
          status = EXCLUDED.status
      `, [
        booking.id, booking.car_id, booking.pickup_date, booking.pickup_time,
        booking.return_date, booking.return_time, booking.discount_code,
        booking.insurance_type, booking.pickup_location, booking.dropoff_location,
        booking.contact_person, booking.contact_phone, booking.special_instructions,
        booking.total_price, booking.price_breakdown, booking.status, booking.created_at
      ]);
    }
    console.log(`✅ Migrated ${bookings.length} bookings`);

    // Migrate booked cars
    console.log('🚗 Migrating booked cars...');
    const bookedCars = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM booked_cars', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const bookedCar of bookedCars) {
      await pgPool.query(`
        INSERT INTO booked_cars (
          id, car_id, booking_id, customer_name, customer_email, customer_phone,
          pickup_date, pickup_time, return_date, return_time, insurance_type,
          pickup_location, dropoff_location, total_price, status, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          car_id = EXCLUDED.car_id,
          booking_id = EXCLUDED.booking_id,
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          customer_phone = EXCLUDED.customer_phone,
          pickup_date = EXCLUDED.pickup_date,
          pickup_time = EXCLUDED.pickup_time,
          return_date = EXCLUDED.return_date,
          return_time = EXCLUDED.return_time,
          insurance_type = EXCLUDED.insurance_type,
          pickup_location = EXCLUDED.pickup_location,
          dropoff_location = EXCLUDED.dropoff_location,
          total_price = EXCLUDED.total_price,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP
      `, [
        bookedCar.id, bookedCar.car_id, bookedCar.booking_id, bookedCar.customer_name,
        bookedCar.customer_email, bookedCar.customer_phone, bookedCar.pickup_date,
        bookedCar.pickup_time, bookedCar.return_date, bookedCar.return_time,
        bookedCar.insurance_type, bookedCar.pickup_location, bookedCar.dropoff_location,
        bookedCar.total_price, bookedCar.status, bookedCar.notes,
        bookedCar.created_at, bookedCar.updated_at
      ]);
    }
    console.log(`✅ Migrated ${bookedCars.length} booked cars`);

    // Migrate wheel coupons
    console.log('🎡 Migrating wheel coupons...');
    const wheelCoupons = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM wheel_coupons', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const wheelCoupon of wheelCoupons) {
      await pgPool.query(`
        INSERT INTO wheel_coupons (id, wheel_id, coupon_id, percentage, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          wheel_id = EXCLUDED.wheel_id,
          coupon_id = EXCLUDED.coupon_id,
          percentage = EXCLUDED.percentage
      `, [wheelCoupon.id, wheelCoupon.wheel_id, wheelCoupon.coupon_id, wheelCoupon.percentage, wheelCoupon.created_at]);
    }
    console.log(`✅ Migrated ${wheelCoupons.length} wheel coupons`);

    console.log('🎉 Data migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateData; 