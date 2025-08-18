const bcrypt = require('bcrypt');
const db = require('../config/database');

class AdminUser {
  // Create a new admin user
  static async create(username, password, email = null) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
        [username, passwordHash, email],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, username, email });
          }
        }
      );
    });
  }

  // Find admin user by username
  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM admin_users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Find admin user by ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM admin_users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Verify password
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Update last login
  static updateLastLogin(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // Get all admin users
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, email, created_at, last_login FROM admin_users ORDER BY created_at DESC',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Delete admin user
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM admin_users WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ deletedRows: this.changes });
          }
        }
      );
    });
  }
}

module.exports = AdminUser; 