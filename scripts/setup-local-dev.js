const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

async function setupLocalDev() {
  console.log('🚀 Setting up local development environment...');
  
  const dbPath = path.join(__dirname, '..', 'carrental.db');
  
  // Remove existing database to start fresh
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Removed existing database');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Read and execute the database schema
    const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim() && !statement.toLowerCase().includes('sqlite_sequence')) {
          await new Promise((resolve, reject) => {
            db.run(statement, (err) => {
              if (err && !err.message.includes('already exists')) {
                console.error('Error creating table:', err.message);
                reject(err);
              } else {
                resolve();
              }
            });
          });
        }
      }
      console.log('✅ Database schema created');
    }
    
    // Create admin user with proper hashed password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
        ['admin', passwordHash, 'admin@rentaly.com'],
        function(err) {
          if (err) {
            console.error('Error creating admin user:', err);
            reject(err);
          } else {
            console.log('✅ Admin user created');
            resolve();
          }
        }
      );
    });
    
    // Add sample cars
    const sampleCars = [
      {
        make_name: 'BMW',
        model_name: 'X5',
        production_year: 2023,
        gear_type: 'Automatic',
        fuel_type: 'Petrol',
        engine_capacity: 3.0,
        car_type: 'SUV',
        num_doors: 5,
        num_passengers: 7,
        price_policy: JSON.stringify({
          "1-2": "120",
          "3-7": "110", 
          "8-20": "100",
          "21-45": "90",
          "46+": "80"
        }),
        booked: 0,
        description: 'Luxury SUV with premium features'
      },
      {
        make_name: 'Mercedes',
        model_name: 'C-Class',
        production_year: 2022,
        gear_type: 'Automatic',
        fuel_type: 'Petrol',
        engine_capacity: 2.0,
        car_type: 'Sedan',
        num_doors: 4,
        num_passengers: 5,
        price_policy: JSON.stringify({
          "1-2": "100",
          "3-7": "90",
          "8-20": "80", 
          "21-45": "70",
          "46+": "60"
        }),
        booked: 0,
        description: 'Elegant sedan with modern technology'
      },
      {
        make_name: 'Audi',
        model_name: 'A4',
        production_year: 2023,
        gear_type: 'Automatic',
        fuel_type: 'Diesel',
        engine_capacity: 2.0,
        car_type: 'Sedan',
        num_doors: 4,
        num_passengers: 5,
        price_policy: JSON.stringify({
          "1-2": "95",
          "3-7": "85",
          "8-20": "75",
          "21-45": "65", 
          "46+": "55"
        }),
        booked: 0,
        description: 'Sporty sedan with quattro all-wheel drive'
      },
      {
        make_name: 'Volkswagen',
        model_name: 'Golf',
        production_year: 2021,
        gear_type: 'Manual',
        fuel_type: 'Petrol',
        engine_capacity: 1.5,
        car_type: 'Hatchback',
        num_doors: 5,
        num_passengers: 5,
        price_policy: JSON.stringify({
          "1-2": "60",
          "3-7": "55",
          "8-20": "50",
          "21-45": "45",
          "46+": "40"
        }),
        booked: 0,
        description: 'Reliable and efficient hatchback'
      }
    ];
    
    for (const car of sampleCars) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO cars (
            make_name, model_name, production_year, gear_type, fuel_type, 
            engine_capacity, car_type, num_doors, num_passengers, price_policy, 
            booked, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            car.make_name, car.model_name, car.production_year, car.gear_type,
            car.fuel_type, car.engine_capacity, car.car_type, car.num_doors,
            car.num_passengers, car.price_policy, car.booked, car.description
          ],
          function(err) {
            if (err) {
              console.error('Error creating car:', err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    console.log('✅ Sample cars created');
    
    // Add sample coupon codes
    const sampleCoupons = [
      {
        code: 'WELCOME10',
        type: 'percentage',
        discount_percentage: 10,
        description: 'Welcome discount for new customers',
        is_active: 1
      },
      {
        code: 'SUMMER20',
        type: 'percentage', 
        discount_percentage: 20,
        description: 'Summer special discount',
        is_active: 1
      }
    ];
    
    for (const coupon of sampleCoupons) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO coupon_codes (
            code, type, discount_percentage, description, is_active
          ) VALUES (?, ?, ?, ?, ?)`,
          [coupon.code, coupon.type, coupon.discount_percentage, coupon.description, coupon.is_active],
          function(err) {
            if (err) {
              console.error('Error creating coupon:', err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    console.log('✅ Sample coupon codes created');
    
    console.log('\n🎉 Local development environment setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@rentaly.com');
    console.log('\n🚗 Sample Cars: 4 cars available');
    console.log('🎫 Sample Coupons: WELCOME10 (10%), SUMMER20 (20%)');
    console.log('\n🌐 Start the server: node server.js');
    console.log('🔗 Access: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    db.close();
  }
}

setupLocalDev(); 