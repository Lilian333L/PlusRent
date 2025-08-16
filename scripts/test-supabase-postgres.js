const { Pool } = require('pg');

// Test PostgreSQL connection to Supabase with session timeout
async function testSupabasePostgres() {
  console.log('🔍 Testing Supabase PostgreSQL connection with Frankfurt VPN...');
  
  // Try port 5432 (session mode) since 6543 is still timing out
  const connectionString = 'postgresql://postgres:Fva7tNZHS4McfHg8@lupoqmzqppynyybbvwah.supabase.co:5432/postgres';
  
  console.log('Connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  console.log('Hostname: lupoqmzqppynyybbvwah.supabase.co');
  console.log('Port: 5432 (Session mode)');
  console.log('Network: Frankfurt VPN');
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // Pooler settings
    max: 10, // Maximum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Connection timeout after 10 seconds
    // Session timeout settings
    statement_timeout: 600000 // 10 minutes in milliseconds
  });

  try {
    console.log('📡 Attempting to connect to Supabase PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to Supabase PostgreSQL!');

    // Set session timeout
    await client.query("SET statement_timeout = '10min';");
    console.log('⏰ Session timeout set to 10 minutes');

    const result = await client.query('SELECT NOW()');
    console.log('📅 Current database time:', result.rows[0].now);

    client.release();
    await pool.end();
    console.log('🎉 Connection test completed successfully!');
  } catch (error) {
    console.error('❌ Error connecting to Supabase PostgreSQL:', error.message);
    await pool.end();
  }
}

testSupabasePostgres(); 