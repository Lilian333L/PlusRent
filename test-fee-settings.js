// Simple test script for fee settings API
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000';
const token = 'your-admin-token'; // Replace with actual token

async function testFeeSettings() {
  try {
    console.log('🔧 Testing fee settings API...');
    
    // Test 1: Get all fee settings
    console.log('\n1. Getting all fee settings...');
    const getResponse = await fetch(`${API_BASE_URL}/api/fee-settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (getResponse.ok) {
      const settings = await getResponse.json();
      console.log('✅ GET successful, found', settings.length, 'settings');
      console.log('First setting:', settings[0]);
    } else {
      console.log('❌ GET failed:', getResponse.status);
    }
    
    // Test 2: Update a single setting
    console.log('\n2. Testing single setting update...');
    const updateResponse = await fetch(`${API_BASE_URL}/api/fee-settings/outside_hours_fee`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 20,
        is_active: true
      })
    });
    
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Single update successful:', result);
    } else {
      const error = await updateResponse.json();
      console.log('❌ Single update failed:', error);
    }
    
    // Test 3: Bulk update
    console.log('\n3. Testing bulk update...');
    const bulkResponse = await fetch(`${API_BASE_URL}/api/fee-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        settings: [
          { setting_key: 'outside_hours_fee', amount: 25, is_active: true },
          { setting_key: 'iasi_airport_pickup', amount: 40, is_active: true }
        ]
      })
    });
    
    if (bulkResponse.ok) {
      const result = await bulkResponse.json();
      console.log('✅ Bulk update successful:', result);
    } else {
      const error = await bulkResponse.json();
      console.log('❌ Bulk update failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFeeSettings(); 