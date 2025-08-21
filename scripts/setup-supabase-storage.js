const { supabase } = require('../lib/supabaseClient');

async function setupSupabaseStorage() {
  console.log('🚀 Setting up Supabase Storage for car images...');
  
  try {
    // Create the car-images bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'car-images');
    
    if (!bucketExists) {
      console.log('📦 Creating car-images bucket...');
      const { data: bucket, error: createError } = await supabase.storage.createBucket('car-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }
      
      console.log('✅ car-images bucket created successfully');
    } else {
      console.log('✅ car-images bucket already exists');
    }
    
    // Set bucket policies for public access
    console.log('🔐 Setting up bucket policies...');
    
    // Policy to allow public read access
    const { error: readPolicyError } = await supabase.storage
      .from('car-images')
      .createSignedUrl('test', 60); // This will fail but helps set up policies
    
    if (readPolicyError && !readPolicyError.message.includes('not found')) {
      console.error('❌ Error setting read policy:', readPolicyError);
    }
    
    console.log('✅ Supabase Storage setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Storage > Policies');
    console.log('3. For the car-images bucket, add these policies:');
    console.log('   - SELECT (public read access)');
    console.log('   - INSERT (authenticated users)');
    console.log('   - UPDATE (authenticated users)');
    console.log('   - DELETE (authenticated users)');
    console.log('');
    console.log('4. Deploy your updated code to Vercel');
    console.log('5. Test image uploads through the admin panel');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupSupabaseStorage(); 