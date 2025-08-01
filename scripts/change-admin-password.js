require('dotenv').config();
const AdminUser = require('../models/admin');
const bcrypt = require('bcrypt');

async function changeAdminPassword() {
  try {
    console.log('🔧 Changing admin password...');
    
    const username = 'admin';
    const newPassword = process.argv[2];
    
    if (!newPassword) {
      console.log('❌ Please provide a new password as an argument');
      console.log('Usage: node scripts/change-admin-password.js <new-password>');
      console.log('Example: node scripts/change-admin-password.js mySecurePassword123');
      return;
    }
    
    // Find admin user
    const adminUser = await AdminUser.findByUsername(username);
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    const { db } = require('../config/database');
    db.run(
      'UPDATE admin_users SET password_hash = ? WHERE username = ?',
      [newPasswordHash, username],
      function(err) {
        if (err) {
          console.error('❌ Error updating password:', err);
        } else {
          console.log('✅ Admin password updated successfully!');
          console.log('Username:', username);
          console.log('New password:', newPassword);
          console.log('');
          console.log('🔑 New Login Credentials:');
          console.log('Username: admin');
          console.log('Password:', newPassword);
          console.log('');
          console.log('🌐 Login URL: http://localhost:3001/login.html');
        }
      }
    );
    
  } catch (error) {
    console.error('❌ Error changing admin password:', error);
  }
}

// Run the script
changeAdminPassword().then(() => {
  console.log('🎉 Password change complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Password change failed:', error);
  process.exit(1);
}); 