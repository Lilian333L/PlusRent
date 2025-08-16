const { Pool } = require('pg');

// Test different connection formats
async function testCorrectConnection() {
  console.log('🔍 Testing different Supabase connection formats...');
  
  // Try different connection formats
  const connectionAttempts = [
    {
      name: 'Standard format (without db.)',
      config: {
        host: 'lupoqmzqppynyybbvwah.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '0pJ5leFhxBxdxbzW',
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'With db. prefix',
      config: {
        host: 'db.lupoqmzqppynyybbvwah.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '0pJ5leFhxBxdxbzW',
        ssl: { rejectUnauthorized: false }
      }
    }
  ];
  
  for (const attempt of connectionAttempts) {
    console.log(`\n🔍 Testing: ${attempt.name}`);
    console.log(`Host: ${attempt.config.host}`);
    
    const pool = new Pool(attempt.config);
    
    try {
      const client = await pool.connect();
      console.log(`✅ SUCCESS: ${attempt.name}`);
      
      const result = await client.query('SELECT NOW()');
      console.log('📅 Current database time:', result.rows[0].now);
      
      client.release();
      await pool.end();
      return; // Exit on first success
      
    } catch (error) {
      console.log(`❌ FAILED: ${attempt.name}`);
      console.log('Error:', error.message);
      await pool.end();
    }
  }
  
  console.log('\n❌ All connection attempts failed');
  console.log('\n💡 Please check your Supabase dashboard for the correct connection string');
}

testCorrectConnection().catch(console.error); 