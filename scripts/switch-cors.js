#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths to CORS files
const corsDevPath = path.join(__dirname, '../middleware/cors.js');
const corsProdPath = path.join(__dirname, '../middleware/cors.production.js');
const corsBackupPath = path.join(__dirname, '../middleware/cors.backup.js');

function switchToProduction() {
  console.log('🔄 Switching to PRODUCTION CORS configuration...');
  
  try {
    // Check if production file exists
    if (!fs.existsSync(corsProdPath)) {
      console.error('❌ Production CORS file not found: middleware/cors.production.js');
      return false;
    }
    
    // Backup current file if it exists
    if (fs.existsSync(corsDevPath)) {
      fs.copyFileSync(corsDevPath, corsBackupPath);
      console.log('💾 Backed up current CORS file');
    }
    
    // Copy production file to main CORS file
    fs.copyFileSync(corsProdPath, corsDevPath);
    console.log('✅ Switched to production CORS configuration');
    console.log('🔒 CORS is now STRICT for production');
    
    return true;
  } catch (error) {
    console.error('❌ Error switching to production CORS:', error.message);
    return false;
  }
}

function switchToDevelopment() {
  console.log('🔄 Switching to DEVELOPMENT CORS configuration...');
  
  try {
    // Check if backup file exists
    if (!fs.existsSync(corsBackupPath)) {
      console.error('❌ No backup file found. Cannot restore development CORS.');
      return false;
    }
    
    // Restore from backup
    fs.copyFileSync(corsBackupPath, corsDevPath);
    console.log('✅ Switched back to development CORS configuration');
    console.log('🔓 CORS is now PERMISSIVE for development');
    
    return true;
  } catch (error) {
    console.error('❌ Error switching to development CORS:', error.message);
    return false;
  }
}

function showStatus() {
  console.log('📋 CORS Configuration Status:');
  console.log('----------------------------');
  
  if (fs.existsSync(corsDevPath)) {
    const content = fs.readFileSync(corsDevPath, 'utf8');
    if (content.includes('STRICT SECURITY')) {
      console.log('🔒 Current: PRODUCTION (strict)');
    } else if (content.includes('PERMISSIVE FOR DEVELOPMENT')) {
      console.log('🔓 Current: DEVELOPMENT (permissive)');
    } else {
      console.log('❓ Current: UNKNOWN configuration');
    }
  } else {
    console.log('❌ No CORS file found');
  }
  
  console.log('');
  console.log('Available commands:');
  console.log('  npm run cors:prod    - Switch to production CORS');
  console.log('  npm run cors:dev     - Switch to development CORS');
  console.log('  npm run cors:status  - Show current status');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'prod':
  case 'production':
    switchToProduction();
    break;
  case 'dev':
  case 'development':
    switchToDevelopment();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('🔄 CORS Configuration Switcher');
    console.log('=============================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/switch-cors.js prod     - Switch to production');
    console.log('  node scripts/switch-cors.js dev      - Switch to development');
    console.log('  node scripts/switch-cors.js status   - Show current status');
    console.log('');
    console.log('Or use npm scripts:');
    console.log('  npm run cors:prod');
    console.log('  npm run cors:dev');
    console.log('  npm run cors:status');
} 