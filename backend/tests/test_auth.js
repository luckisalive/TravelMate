process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../server');

let server;
const PORT = 5001; // Separate test port

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(body && { 'Content-Length': Buffer.byteLength(dataString) }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ status: res.statusCode, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

async function runAuthTests() {
  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}...`);

  const testEmail = `test_${Date.now()}@example.com`;
  let token = null;

  try {
    // 1. Health check test
    console.log('Testing GET /api/health...');
    const health = await request('GET', '/api/health');
    if (health.status !== 200 || health.body.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log(' Health check passed.');

    // 2. Register test
    console.log('Testing POST /api/auth/register...');
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Traveler Alice',
      email: testEmail,
      password: 'securePassword123',
      currency_pref: 'INR',
      travel_style: 'comfort',
    });

    if (regRes.status !== 201 || !regRes.body.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
    }
    token = regRes.body.token;
    console.log(' Registration successful. User ID:', regRes.body.user.id);

    // 3. Duplicate register rejection test
    console.log('Testing duplicate registration rejection...');
    const dupRes = await request('POST', '/api/auth/register', {
      name: 'Alice Clone',
      email: testEmail,
      password: 'anotherPassword',
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 conflict, got ${dupRes.status}`);
    }
    console.log(' Duplicate registration properly rejected (409 Conflict).');

    // 4. Login test
    console.log('Testing POST /api/auth/login...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'securePassword123',
    });
    if (loginRes.status !== 200 || !loginRes.body.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }
    console.log(' Login successful.');

    // 5. Protected profile test
    console.log('Testing GET /api/auth/profile with Bearer token...');
    const profRes = await request('GET', '/api/auth/profile', null, token);
    if (profRes.status !== 200 || profRes.body.user.email !== testEmail) {
      throw new Error(`Profile fetch failed: ${JSON.stringify(profRes)}`);
    }
    console.log(' Profile fetched successfully. Travel Style:', profRes.body.user.travel_style);

    // 6. Update profile test
    console.log('Testing PUT /api/auth/profile...');
    const updateRes = await request('PUT', '/api/auth/profile', {
      name: 'Alice Wonder',
      travel_style: 'cheapest',
      display_currency: 'USD',
    }, token);
    if (updateRes.status !== 200 || updateRes.body.user.travel_style !== 'cheapest') {
      throw new Error(`Profile update failed: ${JSON.stringify(updateRes)}`);
    }
    console.log(' Profile updated successfully. New display currency:', updateRes.body.user.display_currency);

    // 7. Unauthorized request rejection test
    console.log('Testing GET /api/auth/profile with invalid token...');
    const unauthRes = await request('GET', '/api/auth/profile', null, 'invalid.jwt.token');
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }
    console.log(' Unauthorized access properly rejected (401).');

    console.log('\n--- ALL AUTH TESTS PASSED SUCCESSFULLY! ---');
  } finally {
    server.close();
    process.exit(0);
  }
}

runAuthTests().catch((err) => {
  console.error('Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
