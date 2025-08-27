const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM1MjQzMywiZXhwIjoyMDcwOTI4NDMzfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

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