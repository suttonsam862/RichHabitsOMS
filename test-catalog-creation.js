#!/usr/bin/env node

// Test catalog creation through the app frontend to debug the real issue
const testData = {
  name: "Frontend Test Item",
  category: "Testing",
  sport: "General",
  basePrice: 50.00,
  unitCost: 25.00,
  sku: "FRONTEND-TEST-001",
  status: "active",
  description: "Testing from frontend form simulation",
  fabric: "Cotton",
  etaDays: "7-10 days",
  sizes: ["S", "M", "L"],
  colors: ["Red", "Blue"],
  customizationOptions: ["Logo"],
  minQuantity: 1,
  maxQuantity: 100
};

// Simulate the frontend form submission
console.log('Testing catalog creation with data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:5000/api/catalog', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dev-admin-token-12345',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(result => {
  console.log('Catalog creation result:', result);
  if (result.success) {
    console.log('✅ SUCCESS: Item created with ID:', result.data?.id);
  } else {
    console.log('❌ FAILED:', result.message || result.error);
  }
})
.catch(error => {
  console.error('❌ NETWORK ERROR:', error.message);
});