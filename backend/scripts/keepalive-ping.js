/**
 * TravelMate Production Keep-Alive Ping Script
 * 
 * Usage:
 *   node backend/scripts/keepalive-ping.js https://travelmate-api.onrender.com
 *   node backend/scripts/keepalive-ping.js
 * 
 * Purpose:
 *   Render free tier spins down after 15 minutes of inactivity.
 *   Neon PostgreSQL compute suspends after 5 minutes of inactivity.
 *   Running this script periodically prevents cold starts during viva / evaluation demos.
 */

const https = require('https');
const http = require('http');

const targetUrl = process.argv[2] || process.env.PING_TARGET_URL || 'http://localhost:5000/api/health';
const healthUrl = targetUrl.endsWith('/api/health') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/api/health`;

console.log(`[Keep-Alive] Pinging target: ${healthUrl}`);
const startTime = Date.now();

const client = healthUrl.startsWith('https') ? https : http;

const req = client.get(healthUrl, { timeout: 45000 }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const elapsed = Date.now() - startTime;
    console.log(`[Keep-Alive] Status Code: ${res.statusCode}`);
    console.log(`[Keep-Alive] Response Time: ${elapsed}ms`);
    try {
      const parsed = JSON.parse(data);
      console.log('[Keep-Alive] Health Payload:', parsed);
    } catch {
      console.log('[Keep-Alive] Raw Payload:', data.slice(0, 100));
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Service is warm, responsive, and ready!');
      process.exit(0);
    } else {
      console.error(`⚠️ Non-200 status code returned: ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  const elapsed = Date.now() - startTime;
  console.error(`❌ Ping failed after ${elapsed}ms:`, err.message || err.code || String(err));
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('❌ Ping timed out after 45000ms (likely a cold start in progress)');
  process.exit(1);
});
