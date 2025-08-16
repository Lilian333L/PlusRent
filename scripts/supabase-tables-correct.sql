-- Create cars table
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
    drive VARCHAR(50),
    fuel_economy DECIMAL(5,2),
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    rca_insurance_price DECIMAL(8,2),
    casco_insurance_price DECIMAL(8,2),
    is_premium BOOLEAN DEFAULT FALSE,
    likes INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    description JSONB DEFAULT '{}'
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create bookings table
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
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    special_instructions TEXT,
    total_price DECIMAL(10,2) NOT NULL,
    price_breakdown JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars (id)
);

-- Create booked_cars table
CREATE TABLE IF NOT EXISTS booked_cars (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL,
    booking_id INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    return_date DATE NOT NULL,
    return_time TIME NOT NULL,
    insurance_type VARCHAR(50) NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
);

-- Create spinning_wheels table
CREATE TABLE IF NOT EXISTS spinning_wheels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create coupon_codes table
CREATE TABLE IF NOT EXISTS coupon_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'percentage',
    discount_percentage INTEGER,
    description TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    wheel_enabled BOOLEAN DEFAULT FALSE,
    free_days INTEGER,
    available_codes JSONB DEFAULT '[]',
    showed_codes JSONB DEFAULT '[]'
);

-- Create wheel_coupons table
CREATE TABLE IF NOT EXISTS wheel_coupons (
    id SERIAL PRIMARY KEY,
    wheel_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    percentage DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (wheel_id) REFERENCES spinning_wheels (id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupon_codes (id) ON DELETE CASCADE,
    UNIQUE(wheel_id, coupon_id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password TEXT,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user'
); 