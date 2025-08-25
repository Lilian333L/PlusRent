const { supabase, uploadCarImage } = require('../lib/supabaseClient');
const fs = require('fs');
const path = require('path');

async function migrateExistingImages() {
  console.log('🚀 Starting migration of existing car images to Supabase Storage...');
  
  try {
    // Get all cars from the database
    const { data: cars, error } = await supabase
      .from('cars')
      .select('id, make_name, model_name, head_image, gallery_images');
    
    if (error) {
      console.error('❌ Error fetching cars:', error);
      return;
    }
    
    console.log(`📋 Found ${cars.length} cars to check`);
    
    for (const car of cars) {
      console.log(`\n🔍 Processing car ${car.id}: ${car.make_name} ${car.model_name}`);
      
      let updated = false;
      const updateData = {};
      
      // Check head image
      if (car.head_image && car.head_image.startsWith('/uploads/')) {
        console.log(`  📸 Migrating head image: ${car.head_image}`);
        
        try {
          // Check if local file exists
          const localPath = path.join(__dirname, '..', car.head_image);
          if (fs.existsSync(localPath)) {
            // Read the file
            const imageBuffer = fs.readFileSync(localPath);
            const file = {
              buffer: imageBuffer,
              mimetype: 'image/jpeg',
              originalname: path.basename(car.head_image)
            };
            
            // Upload to Supabase Storage
            const supabaseUrl = await uploadCarImage(file, car.id, 'head');
            updateData.head_image = supabaseUrl;
            console.log(`  ✅ Head image migrated to: ${supabaseUrl}`);
            updated = true;
          } else {
            console.log(`  ⚠️  Local file not found: ${localPath}`);
          }
        } catch (error) {
          console.error(`  ❌ Error migrating head image:`, error);
        }
      }
      
      // Check gallery images
      if (car.gallery_images && Array.isArray(car.gallery_images) && car.gallery_images.length > 0) {
        const newGalleryUrls = [];
        let galleryUpdated = false;
        
        for (let i = 0; i < car.gallery_images.length; i++) {
          const galleryPath = car.gallery_images[i];
          
          if (galleryPath && galleryPath.startsWith('/uploads/')) {
            console.log(`  🖼️  Migrating gallery image ${i + 1}: ${galleryPath}`);
            
            try {
              // Check if local file exists
              const localPath = path.join(__dirname, '..', galleryPath);
              if (fs.existsSync(localPath)) {
                // Read the file
                const imageBuffer = fs.readFileSync(localPath);
                const file = {
                  buffer: imageBuffer,
                  mimetype: 'image/jpeg',
                  originalname: path.basename(galleryPath)
                };
                
                // Upload to Supabase Storage
                const supabaseUrl = await uploadCarImage(file, car.id, 'gallery');
                newGalleryUrls.push(supabaseUrl);
                console.log(`  ✅ Gallery image ${i + 1} migrated to: ${supabaseUrl}`);
                galleryUpdated = true;
              } else {
                console.log(`  ⚠️  Local file not found: ${localPath}`);
                newGalleryUrls.push(galleryPath); // Keep original path
              }
            } catch (error) {
              console.error(`  ❌ Error migrating gallery image ${i + 1}:`, error);
              newGalleryUrls.push(galleryPath); // Keep original path
            }
          } else {
            newGalleryUrls.push(galleryPath); // Keep non-local paths
          }
        }
        
        if (galleryUpdated) {
          updateData.gallery_images = JSON.stringify(newGalleryUrls);
          updated = true;
        }
      }
      
      // Update database if any images were migrated
      if (updated) {
        const { error: updateError } = await supabase
          .from('cars')
          .update(updateData)
          .eq('id', car.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating car ${car.id}:`, updateError);
        } else {
          console.log(`  ✅ Car ${car.id} updated successfully`);
        }
      } else {
        console.log(`  ℹ️  No images to migrate for car ${car.id}`);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateExistingImages(); 