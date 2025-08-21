const fetch = require('node-fetch');

async function testSoberDriverAPI() {
  console.log('🧪 Testing Sober Driver API endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/bookings/sober-driver-callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: '+373 22 123 456',
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        special_instructions: 'Test callback request'
      })
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers.raw());
    
    const result = await response.json();
    console.log('📡 Response data:', result);
    
    if (result.success) {
      console.log('✅ API test successful!');
      console.log('📞 Callback ID:', result.callback_id);
      console.log('💬 Message:', result.message);
    } else {
      console.log('❌ API test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testSoberDriverAPI(); 