// Script to add missing columns to Supabase
// Run these SQL commands manually in your Supabase SQL editor

console.log('=== ADD MISSING COLUMNS TO SUPABASE ===');
console.log('');
console.log('Run these SQL commands in your Supabase SQL editor:');
console.log('');

// Add missing columns to cars table
console.log('-- Add missing columns to cars table');
console.log('ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;');
console.log('ALTER TABLE cars ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;');
console.log('ALTER TABLE cars ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;');
console.log('ALTER TABLE cars ADD COLUMN IF NOT EXISTS status TEXT DEFAULT "active";');
console.log('ALTER TABLE cars ADD COLUMN IF NOT EXISTS description TEXT;');
console.log('');

// Add missing columns to bookings table
console.log('-- Add missing columns to bookings table');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_code TEXT;');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_breakdown TEXT;');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT "pending";');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
console.log('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
console.log('');

// Add missing columns to coupon_codes table
console.log('-- Add missing columns to coupon_codes table');
console.log('ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS wheel_enabled BOOLEAN DEFAULT false;');
console.log('ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS free_days INTEGER DEFAULT 0;');
console.log('ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS available_codes TEXT[] DEFAULT \'{}\';');
console.log('ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS showed_codes TEXT[] DEFAULT \'{}\';');
console.log('');

// Add missing columns to spinning_wheels table
console.log('-- Add missing columns to spinning_wheels table');
console.log('ALTER TABLE spinning_wheels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
console.log('');

console.log('=== END OF SQL COMMANDS ===');
console.log('');
console.log('After running these commands, your Supabase schema will match the application requirements.'); 