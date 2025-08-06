const bcrypt = require('bcrypt');
const { db } = require('../config/database');

async function createAdminUser() {
  try {
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@plusrent.com';
    
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingUser) {
      console.log('Admin user already exists with username:', username);
      return;
    }
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert the new user
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
        [username, passwordHash, email],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
    
    console.log('Admin user created successfully!');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Email:', email);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the function
createAdminUser(); 