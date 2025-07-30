const AdminUser = require('../models/admin');
const { initializeDatabase } = require('../config/database');

async function createAdminUser() {
  try {
    // Initialize database
    initializeDatabase();
    
    // Create default admin user
    const adminData = {
      username: 'admin',
      password: 'admin123',
      email: 'admin@rentaly.com'
    };
    
    console.log('Creating admin user...');
    const newAdmin = await AdminUser.create(
      adminData.username,
      adminData.password,
      adminData.email
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('Username:', adminData.username);
    console.log('Password:', adminData.password);
    console.log('Email:', adminData.email);
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('❌ Admin user already exists!');
    } else {
      console.error('❌ Error creating admin user:', error);
    }
    process.exit(1);
  }
}

createAdminUser(); 