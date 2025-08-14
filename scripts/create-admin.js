require('dotenv').config();
const AdminUser = require('../models/admin');

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Default admin credentials
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@rentaly.com';
    
    // Check if admin already exists
    const existingAdmin = await AdminUser.findByUsername(username);
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Created at:', existingAdmin.created_at);
      return;
    }
    
    // Create new admin user
    const newAdmin = await AdminUser.create(username, password, email);
    
    console.log('✅ Admin user created successfully!');
    console.log('Username:', newAdmin.username);
    console.log('Email:', newAdmin.email);
    console.log('ID:', newAdmin.id);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
    console.log('🌐 Login URL: http://localhost:3001/login.html');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    
  } catch (error) {
      console.error('❌ Error creating admin user:', error);
    }
}

// Run the script
createAdmin().then(() => {
  console.log('🎉 Admin setup complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Setup failed:', error);
    process.exit(1);
}); 