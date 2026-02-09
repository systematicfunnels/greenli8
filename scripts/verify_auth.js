const API_URL = 'http://localhost:4242/api';

async function testAuth() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';
  
  console.log('1. Testing Signup...');
  try {
    const signupRes = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Test User' })
    });
    
    if (!signupRes.ok) {
      const txt = await signupRes.text();
      console.error('Signup failed:', signupRes.status, txt);
      return; // Stop if signup fails (e.g. server down)
    }
    const signupData = await signupRes.json();
    console.log('Signup success:', signupData.user.email);
    const token = signupData.token;
    
    console.log('2. Testing Get User (Protected)...');
    const userRes = await fetch(`${API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!userRes.ok) {
        const txt = await userRes.text();
        console.error('Get User failed:', userRes.status, txt);
        return;
    }
    const userData = await userRes.json();
    console.log('Get User success:', userData.email);
    
    console.log('3. Testing Login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status);
      return;
    }
    const loginData = await loginRes.json();
    console.log('Login success. Token received.');
    
    console.log('All auth tests passed!');
  } catch (e) {
      console.error("Test failed (likely server not running):", e.message);
  }
}

testAuth().catch(console.error);
