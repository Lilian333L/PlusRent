const bcrypt = require('bcrypt');
const { supabase } = require('../lib/supabaseClient');

async function createAdminUser() {
  try {
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@plusrent.com';
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existingUser) {
      console.log('Admin user already exists with username:', username);
      return;
    }
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert the new user
    const { data, error } = await supabase
      .from('admin_users')
      .insert([
        { username, password_hash: passwordHash, email }
      ])
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log('Admin user created successfully!');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Email:', email);
    console.log('User ID:', data[0].id);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run the function
createAdminUser(); 