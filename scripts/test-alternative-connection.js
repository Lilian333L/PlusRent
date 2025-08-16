const { Pool } = require('pg');

// Test different connection formats
async function testAlternativeConnections() {
  const baseConnectionString = process.env.SUPABASE_URL;
  
  if (!baseConnectionString) {
    console.log('❌ SUPABASE_URL not set');
    return;
  }
  
  // Try different connection formats
  const connectionAttempts = [
    {
      name: 'Original format',
      config: {
        connectionString: baseConnectionString,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Direct host format',
      config: {
        host: 'db.lupoqmzqppynyybbvwah.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '[0pJ5leFhxBxdxbzW]',
        ssl: { rejectUnauthorized: false }
      }
    }
  ];
  
  for (const attempt of connectionAttempts) {
    console.log(`\n🔍 Testing: ${attempt.name}`);
    
    const pool = new Pool(attempt.config);
    
    try {
      const client = await pool.connect();
      console.log(`✅ ${attempt.name} - SUCCESS!`);
      client.release();
      await pool.end();
      return; // Stop on first success
    } catch (error) {
      console.log(`❌ ${attempt.name} - FAILED:`, error.message);
      await pool.end();
    }
  }
  
  console.log('\n💡 All connection attempts failed. Please check:');
  console.log('   1. Supabase project is active');
  console.log('   2. Connection string is correct');
  console.log('   3. Try accessing Supabase dashboard');
}

testAlternativeConnections(); 