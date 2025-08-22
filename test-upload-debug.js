const fs = require('fs');
const path = require('path');

// Create a simple test image (1x1 pixel JPEG)
const testImageData = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';

// Test data for car-7 image upload
const testData = {
  head_image: {
    data: testImageData,
    extension: 'jpg',
    mimetype: 'image/jpeg'
  }
};

console.log('🧪 Testing image upload to car-7...');
console.log('📊 Test data:', {
  hasHeadImage: !!testData.head_image,
  hasData: !!testData.head_image.data,
  dataLength: testData.head_image.data.length,
  extension: testData.head_image.extension
});

// Make the API call
fetch('http://localhost:3000/api/cars/7/images', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('📡 Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('✅ Response data:', data);
})
.catch(error => {
  console.error('❌ Error:', error);
}); 