-- =====================================================
-- PLUSRENT DATABASE SCHEMA - COMPLETE RECREATION
-- =====================================================
-- This file recreates the entire Supabase database structure
-- Generated from current production database schema
-- Date: $(date)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE CREATION
-- =====================================================

-- Admin Users Table
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Cars Table
CREATE TABLE cars (
    id SERIAL PRIMARY KEY,
    make_name VARCHAR,
    model_name VARCHAR,
    production_year INTEGER,
    gear_type VARCHAR,
    fuel_type VARCHAR,
    engine_capacity NUMERIC,
    car_type VARCHAR,
    num_doors INTEGER,
    num_passengers INTEGER,
    price_policy JSONB,
    booked BOOLEAN DEFAULT false,
    booked_until DATE,
    head_image TEXT,
    gallery_images TEXT,
    description JSONB,
    luggage VARCHAR,
    drive VARCHAR,
    air_conditioning BOOLEAN,
    min_age INTEGER,
    deposit NUMERIC,
    insurance_cost NUMERIC,
    -- Additional car details
    mileage INTEGER,
    fuel_economy NUMERIC,
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    rca_insurance_price NUMERIC,
    casco_insurance_price NUMERIC,
    status VARCHAR DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_premium BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0
);
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR,
    password VARCHAR,
    email VARCHAR,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id),
    user_id INTEGER REFERENCES users(id),
    pickup_date DATE,
    return_date DATE,
    total_price NUMERIC,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    pickup_time TIME,
    return_time TIME,
    discount_code VARCHAR,
    insurance_type VARCHAR NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    special_instructions TEXT,
    price_breakdown JSONB,
    customer_name VARCHAR,
    customer_email VARCHAR,
    customer_phone VARCHAR,
    customer_age INTEGER
);

-- Booked Cars Table
CREATE TABLE booked_cars (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL,
    booking_id INTEGER NOT NULL,
    customer_name VARCHAR NOT NULL,
    customer_email VARCHAR NOT NULL,
    customer_phone VARCHAR NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    return_date DATE NOT NULL,
    return_time TIME NOT NULL,
    insurance_type VARCHAR NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    total_price NUMERIC NOT NULL,
    status VARCHAR DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon Codes Table
CREATE TABLE coupon_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR NOT NULL UNIQUE,
    type VARCHAR NOT NULL DEFAULT 'percentage',
    discount_percentage INTEGER,
    description TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    wheel_enabled BOOLEAN DEFAULT false,
    free_days INTEGER,
    available_codes JSONB DEFAULT '[]'::jsonb,
    showed_codes JSONB DEFAULT '[]'::jsonb
);

-- Coupon Redemptions Table (MISSING - CRITICAL FOR COUPON SYSTEM)
CREATE TABLE coupon_redemptions (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupon_codes(id),
    redemption_code VARCHAR NOT NULL UNIQUE,
    status VARCHAR DEFAULT 'available', -- 'available', 'redeemed', 'expired'
    redeemed_at TIMESTAMP,
    redeemed_by_phone VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phone Numbers Table
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL UNIQUE,
    bookings_ids TEXT[] DEFAULT '{}',
    available_coupons TEXT[] DEFAULT '{}',
    redeemed_coupons TEXT[] DEFAULT '{}',
    return_gift_redeemed BOOLEAN DEFAULT false
);

-- Spinning Wheels Table
CREATE TABLE spinning_wheels (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_premium BOOLEAN DEFAULT false
);

-- Wheel Coupons Table
CREATE TABLE wheel_coupons (
    id SERIAL PRIMARY KEY,
    wheel_id INTEGER NOT NULL REFERENCES spinning_wheels(id),
    coupon_id INTEGER NOT NULL REFERENCES coupon_codes(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    percentage NUMERIC DEFAULT 0
);

-- Fee Settings Table
CREATE TABLE fee_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR NOT NULL UNIQUE,
    setting_name VARCHAR NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sober Driver Callbacks Table
CREATE TABLE sober_driver_callbacks (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR NOT NULL,
    customer_name VARCHAR,
    customer_email VARCHAR,
    special_instructions TEXT,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Cars indexes
CREATE INDEX idx_cars_status ON cars(status);
CREATE INDEX idx_cars_booked ON cars(booked);
CREATE INDEX idx_cars_car_type ON cars(car_type);
CREATE INDEX idx_cars_make_model ON cars(make_name, model_name);

-- Bookings indexes
CREATE INDEX idx_bookings_car_id ON bookings(car_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup_date ON bookings(pickup_date);
CREATE INDEX idx_bookings_customer_phone ON bookings(customer_phone);

-- Booked Cars indexes
CREATE INDEX idx_booked_cars_car_id ON booked_cars(car_id);
CREATE INDEX idx_booked_cars_booking_id ON booked_cars(booking_id);
CREATE INDEX idx_booked_cars_customer_phone ON booked_cars(customer_phone);
CREATE INDEX idx_booked_cars_pickup_date ON booked_cars(pickup_date);

-- Coupon Codes indexes
CREATE INDEX idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX idx_coupon_codes_is_active ON coupon_codes(is_active);
CREATE INDEX idx_coupon_codes_wheel_enabled ON coupon_codes(wheel_enabled);

-- Coupon Redemptions indexes
CREATE INDEX idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_redemption_code ON coupon_redemptions(redemption_code);
CREATE INDEX idx_coupon_redemptions_status ON coupon_redemptions(status);
CREATE INDEX idx_coupon_redemptions_redeemed_by_phone ON coupon_redemptions(redeemed_by_phone);

-- Phone Numbers indexes
CREATE INDEX idx_phone_numbers_phone ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_available_coupons ON phone_numbers USING GIN(available_coupons);
CREATE INDEX idx_phone_numbers_redeemed_coupons ON phone_numbers USING GIN(redeemed_coupons);

-- Spinning Wheels indexes
CREATE INDEX idx_spinning_wheels_is_active ON spinning_wheels(is_active);
CREATE INDEX idx_spinning_wheels_is_premium ON spinning_wheels(is_premium);

-- Wheel Coupons indexes
CREATE INDEX idx_wheel_coupons_wheel_id ON wheel_coupons(wheel_id);
CREATE INDEX idx_wheel_coupons_coupon_id ON wheel_coupons(coupon_id);

-- Fee Settings indexes
CREATE INDEX idx_fee_settings_setting_key ON fee_settings(setting_key);
CREATE INDEX idx_fee_settings_is_active ON fee_settings(is_active);

-- Sober Driver Callbacks indexes
CREATE INDEX idx_sober_driver_phone ON sober_driver_callbacks(phone_number);
CREATE INDEX idx_sober_driver_status ON sober_driver_callbacks(status);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Sample Cars
INSERT INTO cars (make_name, model_name, production_year, gear_type, fuel_type, engine_capacity, car_type, num_doors, num_passengers, price_policy, head_image, description, luggage, drive, air_conditioning, min_age, deposit, insurance_cost, status, is_premium, display_order, likes) VALUES
('BMW', 'M5', 2023, 'Automatic', 'Petrol', 4.4, 'Sports Car', 4, 5, '{"daily": 150, "weekly": 900, "monthly": 3000}', 'bmw-m5.jpg', '{"en": "Luxury sports sedan with exceptional performance", "ro": "Sedan sport de lux cu performanțe excepționale", "ru": "Роскошный спортивный седан с исключительной производительностью"}', 'Large', 'RWD', true, 25, 500, 50, 'available', true, 1, 0),
('Ferrari', 'Enzo', 2022, 'Manual', 'Petrol', 6.0, 'Supercar', 2, 2, '{"daily": 500, "weekly": 3000, "monthly": 10000}', 'ferrari-enzo.jpg', '{"en": "Ultimate supercar experience", "ro": "Experiența supremă de supercar", "ru": "Вершина суперкара"}', 'Small', 'RWD', true, 30, 2000, 200, 'available', true, 2, 0),
('Toyota', 'RAV4', 2023, 'Automatic', 'Hybrid', 2.5, 'SUV', 5, 5, '{"daily": 80, "weekly": 480, "monthly": 1600}', 'toyota-rav.jpg', '{"en": "Reliable and efficient SUV", "ro": "SUV fiabil și eficient", "ru": "Надёжный и эффективный SUV"}', 'Large', 'AWD', true, 21, 200, 30, 'available', false, 3, 0),
('Range Rover', 'Evoque', 2023, 'Automatic', 'Petrol', 2.0, 'SUV', 5, 5, '{"daily": 120, "weekly": 720, "monthly": 2400}', 'range-rover.jpg', '{"en": "Luxury compact SUV", "ro": "SUV compact de lux", "ru": "Роскошный компактный SUV"}', 'Medium', 'AWD', true, 23, 300, 40, 'available', true, 4, 0),
('Mini', 'Cooper', 2023, 'Manual', 'Petrol', 1.5, 'Hatchback', 3, 4, '{"daily": 60, "weekly": 360, "monthly": 1200}', 'mini-cooper.jpg', '{"en": "Fun and stylish city car", "ro": "Mașină urbană distractivă și stilizată", "ru": "Весёлый и стильный городской автомобиль"}', 'Small', 'FWD', true, 21, 150, 25, 'available', false, 5, 0);

-- Sample Coupon Codes
INSERT INTO coupon_codes (code, type, discount_percentage, description, expires_at, is_active, wheel_enabled, free_days, available_codes, showed_codes) VALUES
('WELCOME10', 'percentage', 10, 'Welcome discount for new customers', '2024-12-31 23:59:59', true, true, null, '["WTCFE5FW2Q", "M1IL4EJ3LJ", "NIG80RETDK", "M3PV1D0G44"]'::jsonb, '[]'::jsonb),
('SUMMER20', 'percentage', 20, 'Summer special discount', '2024-08-31 23:59:59', true, true, null, '["SUMMER2024A", "SUMMER2024B", "SUMMER2024C"]'::jsonb, '[]'::jsonb),
('FREEDAYS', 'free_days', null, 'Free rental days promotion', '2024-12-31 23:59:59', true, true, 2, '["FREEDAYS001", "FREEDAYS002"]'::jsonb, '[]'::jsonb);

-- Sample Spinning Wheels
INSERT INTO spinning_wheels (name, description, is_active, is_premium) VALUES
('Welcome Wheel', 'Welcome bonus wheel for new customers', true, false),
('Premium Wheel', 'Premium wheel with better rewards', true, true),
('Summer Special', 'Summer promotion wheel', false, false);

-- Sample Wheel Coupons
INSERT INTO wheel_coupons (wheel_id, coupon_id, percentage) VALUES
(1, 1, 10),
(1, 2, 20),
(2, 1, 15),
(2, 2, 25),
(3, 3, 5);

-- Sample Fee Settings
INSERT INTO fee_settings (setting_key, setting_name, amount, currency, description) VALUES
('delivery_fee', 'Delivery Fee', 25.00, 'EUR', 'Fee for car delivery to customer location'),
('late_return_fee', 'Late Return Fee', 50.00, 'EUR', 'Fee for returning car after scheduled time'),
('cleaning_fee', 'Cleaning Fee', 30.00, 'EUR', 'Fee for excessive cleaning required'),
('fuel_fee', 'Fuel Fee', 15.00, 'EUR', 'Fee for refueling service'),
('insurance_deposit', 'Insurance Deposit', 200.00, 'EUR', 'Refundable insurance deposit');

-- Sample Admin User
INSERT INTO admin_users (username, password_hash, email) VALUES
('admin', '$2b$10$rQZ8K9mN2pL3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'admin@plusrent.com');

-- Sample Phone Numbers (with coupon data)
INSERT INTO phone_numbers (phone_number, bookings_ids, available_coupons, redeemed_coupons, return_gift_redeemed) VALUES
('68230603', '{}', '{"M1IL4EJ3LJ", "NIG80RETDK"}', '{}', false),
('324532452345', '{}', '{"WTCFE5FW2Q"}', '{}', false),
('+40712345678', '{}', '{"SUMMER2024A"}', '{}', false);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booked_cars_updated_at BEFORE UPDATE ON booked_cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupon_redemptions_updated_at BEFORE UPDATE ON coupon_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spinning_wheels_updated_at BEFORE UPDATE ON spinning_wheels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_settings_updated_at BEFORE UPDATE ON fee_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sober_driver_callbacks_updated_at BEFORE UPDATE ON sober_driver_callbacks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booked_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE spinning_wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sober_driver_callbacks ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow all for now - adjust as needed)
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations on cars" ON cars FOR ALL USING (true);
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on bookings" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all operations on booked_cars" ON booked_cars FOR ALL USING (true);
CREATE POLICY "Allow all operations on coupon_codes" ON coupon_codes FOR ALL USING (true);
CREATE POLICY "Allow all operations on coupon_redemptions" ON coupon_redemptions FOR ALL USING (true);
CREATE POLICY "Allow all operations on phone_numbers" ON phone_numbers FOR ALL USING (true);
CREATE POLICY "Allow all operations on spinning_wheels" ON spinning_wheels FOR ALL USING (true);
CREATE POLICY "Allow all operations on wheel_coupons" ON wheel_coupons FOR ALL USING (true);
CREATE POLICY "Allow all operations on fee_settings" ON fee_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on sober_driver_callbacks" ON sober_driver_callbacks FOR ALL USING (true);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'PLUSRENT DATABASE SCHEMA CREATED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created: 12 (including coupon_redemptions)';
    RAISE NOTICE 'Indexes created: 25+';
    RAISE NOTICE 'Sample data inserted';
    RAISE NOTICE 'Triggers and functions configured';
    RAISE NOTICE 'Row Level Security enabled';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Your database is ready to use!';
    RAISE NOTICE '=====================================================';
END $$;
