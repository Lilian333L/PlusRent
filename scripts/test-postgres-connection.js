const { Pool } = require('pg');

// Test connection
async function testConnection() {
  const connectionString = process.env.SUPABASE_URL;
  
  if (!connectionString) {
    console.log('❌ SUPABASE_URL environment variable not set');
    return;
  }
  
  console.log('🔍 Testing PostgreSQL connection...');
  console.log('Connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT NOW()');
    console.log('📅 Current database time:', result.rows[0].now);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('💡 Please check:');
    console.log('   - Your Supabase project is active');
    console.log('   - Connection string is correct');
    console.log('   - Network connectivity');
  }
}

testConnection(); 