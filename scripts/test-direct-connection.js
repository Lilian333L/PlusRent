const { Pool } = require('pg');

// Test direct connection parameters
async function testDirectConnection() {
  console.log('🔍 Testing direct PostgreSQL connection...');
  
  const config = {
    host: 'db.lupoqmzqppynyybbvwah.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '0pJ5leFhxBxdxbzW',
    ssl: {
      rejectUnauthorized: false
    }
  };
  
  console.log('Connection config:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: '****'
  });
  
  const pool = new Pool(config);

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT NOW()');
    console.log('📅 Current database time:', result.rows[0].now);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('💡 Error details:', error);
  }
}

testDirectConnection(); 