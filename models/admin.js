const bcrypt = require('bcrypt');
const { supabase } = require('../lib/supabaseClient');

class AdminUser {
  // Create a new admin user
  static async create(username, password, email = null) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const { data, error } = await supabase
      .from('admin_users')
      .insert([
        { username, password_hash: passwordHash, email }
      ])
      .select();
    
    if (error) {
      throw error;
    }
    
    return { id: data[0].id, username, email };
  }

  // Find admin user by username
  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }
    
    return data;
  }

  // Find admin user by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }
    
    return data;
  }

  // Verify password
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Update last login
  static async updateLastLogin(id) {
    const { error } = await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  }

  // Get all admin users
  static async getAll() {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, email, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  // Delete admin user
  static async delete(id) {
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return { deletedRows: 1 };
  }
}

module.exports = AdminUser; 