const { createClient } = require('@supabase/supabase-js');

// Test the API key
const SUPABASE_URL = 'https://lupoqmzqppynyybbvwah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cG9xbXpxcHB5bnl5YmJ2d2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTI0MzMsImV4cCI6MjA3MDkyODQzM30.DLz96LRZNw6BZsK6qhYDIbe70m7GAsPDMKAq6z1gfgI';

async function testSupabaseKey() {
  console.log('🧪 Testing Supabase API key...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data, error } = await supabase.from('cars').select('*').limit(1);
    
    if (error) {
      console.log('❌ Supabase error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Data received:', data ? data.length : 0, 'records');
    return true;
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
}

testSupabaseKey().then(success => {
  process.exit(success ? 0 : 1);
}); 