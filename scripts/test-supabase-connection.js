const { Pool } = require('pg');

// Test different connection formats
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase PostgreSQL connection...');
  
  // Connection string from your deployment guide
  const connectionString = 'postgresql://postgres:0pJ5leFhxBxdxbzW@db.lupoqmzqppynyybbvwah.supabase.co:5432/postgres';
  
  console.log('Connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  // Try different connection formats
  const connectionAttempts = [
    {
      name: 'Connection string format',
      config: {
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Direct parameters format',
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
    console.log(`\n🔄 Trying ${attempt.name}...`);
    
    const pool = new Pool(attempt.config);
    
    try {
      const client = await pool.connect();
      console.log(`✅ Successfully connected using ${attempt.name}!`);
      
      const result = await client.query('SELECT NOW()');
      console.log('📅 Current database time:', result.rows[0].now);
      
      // Test if we can create a simple table
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_connection (
          id SERIAL PRIMARY KEY,
          test_column VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Successfully created test table!');
      
      // Clean up
      await client.query('DROP TABLE IF EXISTS test_connection');
      console.log('✅ Successfully cleaned up test table!');
      
      client.release();
      await pool.end();
      
      console.log(`🎉 ${attempt.name} is working perfectly!`);
      return true;
      
    } catch (error) {
      console.log(`❌ ${attempt.name} failed:`, error.message);
      
      if (error.code === 'ENOTFOUND') {
        console.log('   This suggests the hostname cannot be resolved.');
        console.log('   Please check your Supabase project is active and the hostname is correct.');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   This suggests the connection was refused.');
        console.log('   Please check your Supabase project is running and accessible.');
      } else if (error.code === '28P01') {
        console.log('   This suggests authentication failed.');
        console.log('   Please check your password is correct.');
      }
      
      await pool.end();
    }
  }
  
  console.log('\n💥 All connection attempts failed.');
  console.log('\n🔧 Troubleshooting suggestions:');
  console.log('1. Check if your Supabase project is active in the dashboard');
  console.log('2. Verify the connection string in Settings → Database');
  console.log('3. Make sure the hostname is correct');
  console.log('4. Check if your IP is allowed (if restrictions are enabled)');
  
  return false;
}

// Run the test
testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🎯 Ready to proceed with database setup!');
    } else {
      console.log('\n❌ Please fix the connection issues before proceeding.');
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
  }); 