const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

async function setupLocalDev() {
  console.log('🚀 Setting up local development environment...');
  
  const dbPath = path.join(__dirname, '..', 'carrental.db');
  
  // Remove existing database to start fresh
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Removed existing database');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Read and execute the complete database schema
    const schemaPath = path.join(__dirname, '..', 'database_schema_complete.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim() && !statement.toLowerCase().includes('sqlite_sequence')) {
          await new Promise((resolve, reject) => {
            db.run(statement, (err) => {
              if (err && !err.message.includes('already exists')) {
                console.error('Error creating table:', err.message);
                reject(err);
              } else {
                resolve();
              }
            });
          });
        }
      }
      console.log('✅ Complete database schema created with sample data');
    }
    
    console.log('\n🎉 Local development environment setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@rentaly.com');
    console.log('\n🚗 Sample Cars: 4 cars available');
    console.log('🎫 Sample Coupons: WELCOME10 (10%), SUMMER20 (20%)');
    console.log('\n🌐 Start the server: node server.js');
    console.log('🔗 Access: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    db.close();
  }
}

setupLocalDev(); 