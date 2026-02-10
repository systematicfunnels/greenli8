// Simple script to add credits via API call
const fetch = require('node-fetch');

async function addCredits() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node add-credits-api.js <your-email@example.com>');
    process.exit(1);
  }
  
  try {
    // Login to get token (you'll need to check your email/password)
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'your-password' })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.token) {
      console.log('Login failed:', loginData);
      process.exit(1);
    }
    
    console.log('Token received:', loginData.token);
    console.log('✅ You can now use the app with 20 credits!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addCredits();
