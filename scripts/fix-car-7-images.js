const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function fixCar7Images() {
  console.log('🔧 Fixing car 7 image paths in database...');
  
  const carId = 7;
  const uploadsDir = path.join(__dirname, '..', 'uploads', `car-${carId}`);
  
  // Check if the directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ Uploads directory not found:', uploadsDir);
    return;
  }
  
  // Get all files in the directory
  const files = fs.readdirSync(uploadsDir);
  console.log('📁 Files found in uploads directory:', files);
  
  let headImagePath = null;
  const galleryImagePaths = [];
  
  // Categorize files
  files.forEach(file => {
    if (file.startsWith('head')) {
      headImagePath = `/uploads/car-${carId}/${file}`;
    } else if (file.startsWith('gallery')) {
      galleryImagePaths.push(`/uploads/car-${carId}/${file}`);
    }
  });
  
  console.log('🖼️ Head image path:', headImagePath);
  console.log('🖼️ Gallery image paths:', galleryImagePaths);
  
  // Update the database
  const galleryImagesJson = JSON.stringify(galleryImagePaths);
  
  db.run(
    'UPDATE cars SET head_image = ?, gallery_images = ? WHERE id = ?',
    [headImagePath, galleryImagesJson, carId],
    function(err) {
      if (err) {
        console.error('❌ Error updating database:', err);
      } else {
        console.log('✅ Database updated successfully!');
        console.log(`   Rows affected: ${this.changes}`);
        
        // Verify the update
        db.get('SELECT head_image, gallery_images FROM cars WHERE id = ?', [carId], (err, row) => {
          if (err) {
            console.error('❌ Error verifying update:', err);
          } else {
            console.log('🔍 Verification - Updated data:');
            console.log('   Head image:', row.head_image);
            console.log('   Gallery images:', row.gallery_images);
          }
          process.exit(0);
        });
      }
    }
  );
}

fixCar7Images().catch(console.error); 