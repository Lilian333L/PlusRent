const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - use environment variables only
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lupoqmzqppynyybbvwah.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Service role key for server-side operations (bypasses RLS)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug logging for environment variables
console.log('🔧 Supabase Client Debug:');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// Validate required environment variables
if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// JWT_SECRET is optional for now
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Create Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Storage bucket name for car images
const CAR_IMAGES_BUCKET = 'car-images';

// Helper function to upload image to Supabase Storage
async function uploadCarImage(file, carId, imageType = 'gallery') {
  try {
    const timestamp = Date.now();
    const fileName = imageType === 'head' ? 'head.jpg' : `gallery_${timestamp}.jpg`;
    const filePath = `car-${carId}/${fileName}`;
    
    // Use admin client for server-side uploads (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(CAR_IMAGES_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CAR_IMAGES_BUCKET)
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCarImage:', error);
    throw error;
  }
}

// Helper function to delete image from Supabase Storage
async function deleteCarImage(carId, fileName) {
  try {
    const filePath = `car-${carId}/${fileName}`;
    
    // Use admin client for server-side deletions (bypasses RLS)
    const { error } = await supabaseAdmin.storage
      .from(CAR_IMAGES_BUCKET)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteCarImage:', error);
    throw error;
  }
}

// Helper function to get public URL for an image
function getCarImageUrl(carId, fileName) {
  const filePath = `car-${carId}/${fileName}`;
  const { data } = supabase.storage
    .from(CAR_IMAGES_BUCKET)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

module.exports = { 
  supabase, 
  supabaseAdmin,
  uploadCarImage, 
  deleteCarImage, 
  getCarImageUrl,
  CAR_IMAGES_BUCKET 
}; 