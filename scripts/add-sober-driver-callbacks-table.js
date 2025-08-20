const db = require('../config/database');
const { supabase } = require('../lib/supabaseClient');

async function addSoberDriverCallbacksTable() {
  console.log('🔧 Adding sober_driver_callbacks table...');

  // Check if we're using Supabase
  const isSupabase = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isSupabase) {
    console.log('📊 Using Supabase for sober_driver_callbacks table');
    
    try {
      // Create the table in Supabase
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS sober_driver_callbacks (
            id SERIAL PRIMARY KEY,
            phone_number VARCHAR(20) NOT NULL,
            customer_name VARCHAR(100),
            customer_email VARCHAR(100),
            special_instructions TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create index on phone_number for faster lookups
          CREATE INDEX IF NOT EXISTS idx_sober_driver_callbacks_phone ON sober_driver_callbacks(phone_number);
          
          -- Create index on status for filtering
          CREATE INDEX IF NOT EXISTS idx_sober_driver_callbacks_status ON sober_driver_callbacks(status);
          
          -- Create index on created_at for sorting
          CREATE INDEX IF NOT EXISTS idx_sober_driver_callbacks_created_at ON sober_driver_callbacks(created_at);
        `
      });

      if (error) {
        console.error('❌ Error creating sober_driver_callbacks table in Supabase:', error);
        return false;
      }

      console.log('✅ Sober driver callbacks table created successfully in Supabase');
      return true;
    } catch (error) {
      console.error('❌ Error creating sober_driver_callbacks table in Supabase:', error);
      return false;
    }
  } else {
    console.log('💾 Using SQLite for sober_driver_callbacks table');
    
    return new Promise((resolve) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS sober_driver_callbacks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT NOT NULL,
          customer_name TEXT,
          customer_email TEXT,
          special_instructions TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, function(err) {
        if (err) {
          console.error('❌ Error creating sober_driver_callbacks table in SQLite:', err);
          resolve(false);
          return;
        }

        // Create indexes for better performance
        db.run('CREATE INDEX IF NOT EXISTS idx_sober_driver_callbacks_phone ON sober_driver_callbacks(phone_number)', (err) => {
          if (err) console.error('Error creating phone index:', err);
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_sober_driver_callbacks_status ON sober_driver_callbacks(status)', (err) => {
          if (err) console.error('Error creating status index:', err);
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_sober_driver_callbacks_created_at ON sober_driver_callbacks(created_at)', (err) => {
          if (err) console.error('Error creating created_at index:', err);
        });

        console.log('✅ Sober driver callbacks table created successfully in SQLite');
        resolve(true);
      });
    });
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addSoberDriverCallbacksTable()
    .then(success => {
      if (success) {
        console.log('🎉 Sober driver callbacks table migration completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Sober driver callbacks table migration failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error during migration:', error);
      process.exit(1);
    });
}

module.exports = { addSoberDriverCallbacksTable }; 