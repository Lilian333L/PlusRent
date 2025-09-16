const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use service role key for admin operations to bypass RLS
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Storage bucket name for car images
const CAR_IMAGES_BUCKET = 'car-images';

// Helper function to upload image to Supabase Storage
async function uploadCarImage(file, carId, imageType = 'gallery') {
  try {
    const timestamp = Date.now();
    const fileName = imageType === 'head' ? 'head.jpg' : `gallery_${timestamp}.jpg`;
    const filePath = `car-${carId}/${fileName}`;
    
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
    const { data: urlData } = supabaseAdmin.storage
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