-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR RENTALY CAR RENTAL
-- =====================================================
-- This file contains all table definitions for consistent database setup
-- Used by both local development and production environments

-- =====================================================
-- CARS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    production_year INTEGER NOT NULL,
    gear_type TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    engine_capacity REAL NULL,
    car_type TEXT NOT NULL,
    num_doors INTEGER NOT NULL,
    num_passengers INTEGER NOT NULL,
    price_policy TEXT NOT NULL, -- JSON string with pricing tiers
    booked INTEGER DEFAULT 0,
    booked_until TEXT NULL,
    head_image TEXT NULL,
    gallery_images TEXT NULL, -- JSON array of image paths
    luggage TEXT NULL,
    mileage INTEGER NULL,
    drive TEXT NULL,
    fuel_economy REAL NULL,
    exterior_color TEXT NULL,
    interior_color TEXT NULL,
    rca_insurance_price REAL NULL,
    casco_insurance_price REAL NULL,
    is_premium BOOLEAN DEFAULT 0,
    likes INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    description TEXT DEFAULT '{}', -- JSON object or plain text
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ADMIN USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NULL
);

-- =====================================================
-- BOOKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    return_date TEXT NOT NULL,
    return_time TEXT NOT NULL,
    discount_code TEXT NULL,
    insurance_type TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    customer_name TEXT NULL,
    customer_phone TEXT NULL,
    customer_email TEXT NULL,
    special_instructions TEXT NULL,
    total_price REAL NOT NULL,
    price_breakdown TEXT NULL, -- JSON object with price details
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars (id)
);

-- =====================================================
-- BOOKED CARS TABLE (for tracking active rentals)
-- =====================================================
CREATE TABLE IF NOT EXISTS booked_cars (
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
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
);

-- =====================================================
-- COUPON CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',
    discount_percentage INTEGER NULL,
    description TEXT NULL,
    expires_at DATETIME DEFAULT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    wheel_enabled BOOLEAN DEFAULT 0,
    free_days INTEGER NULL,
    available_codes TEXT DEFAULT '[]', -- JSON array
    showed_codes TEXT DEFAULT '[]' -- JSON array
);

-- =====================================================
-- SPINNING WHEELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS spinning_wheels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- WHEEL COUPONS TABLE (junction table)
-- =====================================================
CREATE TABLE IF NOT EXISTS wheel_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wheel_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    percentage REAL DEFAULT 0,
    FOREIGN KEY (wheel_id) REFERENCES spinning_wheels (id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupon_codes (id) ON DELETE CASCADE,
    UNIQUE(wheel_id, coupon_id)
);

-- =====================================================
-- USERS TABLE (for future customer accounts)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NULL,
    password TEXT NULL,
    email TEXT UNIQUE NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Cars table indexes
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make_name, model_name);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_booked ON cars(booked);
CREATE INDEX IF NOT EXISTS idx_cars_type ON cars(car_type);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(production_year);

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(pickup_date, return_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_phone);

-- Admin users table indexes
CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);

-- Coupon codes table indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupon_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires ON coupon_codes(expires_at);

-- Spinning wheels table indexes
CREATE INDEX IF NOT EXISTS idx_wheels_active ON spinning_wheels(is_active);

-- =====================================================
-- TRIGGERS FOR DATA INTEGRITY
-- =====================================================

-- Update the updated_at timestamp when cars are modified
CREATE TRIGGER IF NOT EXISTS update_cars_timestamp 
    AFTER UPDATE ON cars
    FOR EACH ROW
    BEGIN
        UPDATE cars SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Update the updated_at timestamp when booked_cars are modified
CREATE TRIGGER IF NOT EXISTS update_booked_cars_timestamp 
    AFTER UPDATE ON booked_cars
    FOR EACH ROW
    BEGIN
        UPDATE booked_cars SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- =====================================================
-- SAMPLE DATA INSERTS (for development)
-- =====================================================


INSERT OR IGNORE INTO admin_users (username, password_hash, email) VALUES 
('admin', '$2b$10$w1DbraGOyyurUV630oOTbeYJKpvBxVtyuILb6RqUYDDkL/DoS5tGO', 'admin@rentaly.com');

-- Insert sample cars
INSERT OR IGNORE INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, description) VALUES 
('BMW', 'X5', 2023, 'Automatic', 'Petrol', 3.0, 'SUV', 5, 7, '{"1-2":"120","3-7":"110","8-20":"100","21-45":"90","46+":"80"}', 'Luxury SUV with premium features'),
('Mercedes', 'C-Class', 2022, 'Automatic', 'Petrol', 2.0, 'Sedan', 4, 5, '{"1-2":"100","3-7":"90","8-20":"80","21-45":"70","46+":"60"}', 'Elegant sedan with modern technology'),
('Audi', 'A4', 2023, 'Automatic', 'Diesel', 2.0, 'Sedan', 4, 5, '{"1-2":"95","3-7":"85","8-20":"75","21-45":"65","46+":"55"}', 'Sporty sedan with quattro all-wheel drive'),
('Volkswagen', 'Golf', 2021, 'Manual', 'Petrol', 1.5, 'Hatchback', 5, 5, '{"1-2":"60","3-7":"55","8-20":"50","21-45":"45","46+":"40"}', 'Reliable and efficient hatchback');

-- Insert sample coupon codes
INSERT OR IGNORE INTO coupon_codes (code, type, discount_percentage, description, is_active) VALUES 
('WELCOME10', 'percentage', 10, 'Welcome discount for new customers', 1),
('SUMMER20', 'percentage', 20, 'Summer special discount', 1);

-- Insert sample spinning wheel
INSERT OR IGNORE INTO spinning_wheels (name, description, is_active) VALUES 
('Daily Wheel', 'Daily spinning wheel for discounts', 1);

-- =====================================================
-- END OF SCHEMA
-- ===================================================== 