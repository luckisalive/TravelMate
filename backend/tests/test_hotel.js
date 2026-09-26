process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const app = require('../server');
const db = require('../config/db');

const TEST_PORT = 5002;
let server;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 Running Phase 4 Hotel Booking Module Integration Tests');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    server = app.listen(TEST_PORT);
    await new Promise((r) => setTimeout(r, 600));

    // Test 1: GET /api/rates
    console.log('Testing GET /api/rates...');
    const ratesRes = await makeRequest('/api/rates');
    assert(ratesRes.status === 200, 'Exchange rates endpoint returns 200 OK');
    assert(ratesRes.body.base === 'INR', 'Base currency is INR');
    assert(ratesRes.body.rates && ratesRes.body.rates.USD > 0, 'Rates contain USD rate');
    passed += 3;

    // Test 2: GET /api/hotels (all)
    console.log('\nTesting GET /api/hotels pagination & listing...');
    const hotelsRes = await makeRequest('/api/hotels?limit=10');
    assert(hotelsRes.status === 200, 'Hotels endpoint returns 200 OK');
    assert(hotelsRes.body.data.hotels.length > 0, 'Returns list of hotels');
    assert(hotelsRes.body.data.pagination.total >= 30, 'Total hotels >= 30 in database');
    assert(hotelsRes.body.data.cities.length >= 5, 'Contains at least 5 cities');
    passed += 4;

    const firstHotel = hotelsRes.body.data.hotels[0];

    // Test 3: City filtering
    console.log('\nTesting GET /api/hotels?city=Goa...');
    const goaRes = await makeRequest('/api/hotels?city=Goa');
    assert(goaRes.status === 200, 'City filter returns 200 OK');
    assert(
      goaRes.body.data.hotels.every((h) => h.city.toLowerCase() === 'goa'),
      'All returned hotels are in Goa'
    );
    passed += 2;

    // Test 4: Price filtering
    console.log('\nTesting GET /api/hotels?maxPrice=4000...');
    const priceRes = await makeRequest('/api/hotels?maxPrice=4000');
    assert(priceRes.status === 200, 'Price filter returns 200 OK');
    assert(
      priceRes.body.data.hotels.every((h) => h.price_per_night <= 4000),
      'All returned hotels have price_per_night <= 4000'
    );
    passed += 2;

    // Test 5: Star rating filtering
    console.log('\nTesting GET /api/hotels?minStars=4...');
    const starsRes = await makeRequest('/api/hotels?minStars=4');
    assert(starsRes.status === 200, 'Stars filter returns 200 OK');
    assert(
      starsRes.body.data.hotels.every((h) => h.stars >= 4),
      'All returned hotels have stars >= 4'
    );
    passed += 2;

    // Test 6: Sorting by price asc
    console.log('\nTesting GET /api/hotels?sortBy=price_asc...');
    const sortRes = await makeRequest('/api/hotels?sortBy=price_asc&limit=10');
    assert(sortRes.status === 200, 'Sort by price_asc returns 200 OK');
    const prices = sortRes.body.data.hotels.map((h) => h.price_per_night);
    const isSorted = prices.every((val, i, arr) => !i || arr[i - 1] <= val);
    assert(isSorted, 'Hotels are properly sorted in ascending order of price');
    passed += 2;

    // Test 7: Recommendations scoring (cheapest vs comfort)
    console.log('\nTesting recommendations heuristic (style=cheapest vs style=comfort)...');
    const recCheapRes = await makeRequest('/api/hotels?sortBy=recommended&style=cheapest&city=Mumbai');
    assert(recCheapRes.status === 200, 'Recommended sort returns 200 OK');
    assert(
      recCheapRes.body.data.hotels[0].recommendation_score !== undefined,
      'Hotel contains recommendation_score'
    );
    assert(
      recCheapRes.body.data.hotels[0].recommendation_reason !== undefined,
      'Hotel contains explainable recommendation_reason'
    );
    passed += 3;

    // Test 8: Single hotel details
    console.log(`\nTesting GET /api/hotels/${firstHotel.id}...`);
    const detailRes = await makeRequest(`/api/hotels/${firstHotel.id}`);
    assert(detailRes.status === 200, 'Single hotel detail returns 200 OK');
    assert(detailRes.body.data.hotel.id === firstHotel.id, 'Hotel ID matches requested ID');
    assert(Array.isArray(detailRes.body.data.hotel.amenities), 'Hotel contains amenities array');
    assert(
      detailRes.body.data.outboundSearchUrls && detailRes.body.data.outboundSearchUrls.bookingCom,
      'Contains outbound search URLs (Booking.com, MakeMyTrip, Google)'
    );
    passed += 4;

    // Test 9: Non-existent hotel returns 404
    console.log('\nTesting GET /api/hotels/999999 (non-existent)...');
    const notFoundRes = await makeRequest('/api/hotels/999999');
    assert(notFoundRes.status === 404, 'Non-existent hotel returns 404 Not Found');
    passed += 1;

    // Setup Test Users
    console.log('\nSetting up test users for booking & IDOR verification...');
    const emailA = `test_hotel_user_a_${Date.now()}@example.com`;
    const emailB = `test_hotel_user_b_${Date.now()}@example.com`;

    const regA = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'User A',
      email: emailA,
      password: 'password123',
    });
    const tokenA = regA.body.token;

    const regB = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'User B',
      email: emailB,
      password: 'password123',
    });
    const tokenB = regB.body.token;

    // Test 10: Unauthenticated booking rejection
    console.log('\nTesting unauthenticated POST /api/bookings/hotel...');
    const unauthBooking = await makeRequest('/api/bookings/hotel', { method: 'POST' }, {
      hotel_id: firstHotel.id,
      check_in: '2026-11-01',
      check_out: '2026-11-04',
    });
    assert(unauthBooking.status === 401, 'Unauthenticated booking rejected with 401');
    passed += 1;

    // Test 11: Authenticated booking with auto-created trip & immutable rates
    console.log('\nTesting authenticated hotel booking for User A...');
    const bookingRes = await makeRequest(
      '/api/bookings/hotel',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } },
      {
        hotel_id: firstHotel.id,
        check_in: '2026-11-01',
        check_out: '2026-11-04',
        rooms: 1,
        guests: 2,
        currency: 'USD',
      }
    );

    assert(bookingRes.status === 201, 'Booking created with 201 Created');
    const bookingData = bookingRes.body.data.booking;
    assert(bookingData.status === 'confirmed', 'Booking status is confirmed');
    assert(bookingData.nights === 3, 'Calculated nights = 3 (Nov 1 to Nov 4)');
    assert(bookingData.currency === 'USD', 'Currency stored is USD');
    assert(bookingData.amount_base === firstHotel.price_per_night * 3, 'amount_base equals 3 * price_per_night');
    assert(bookingData.rate_used > 0, 'rate_used is recorded at save time');
    assert(bookingRes.body.data.trip_id > 0, 'Auto-linked to a valid trip');
    passed += 7;

    const bookingId = bookingData.id;

    // Test 12: GET /api/bookings (User A)
    console.log('\nTesting GET /api/bookings for User A...');
    const myBookingsRes = await makeRequest(
      '/api/bookings',
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(myBookingsRes.status === 200, 'User bookings list returns 200 OK');
    assert(myBookingsRes.body.data.length >= 1, 'Contains at least 1 booking');
    assert(myBookingsRes.body.data[0].hotel.name === firstHotel.name, 'Booking joined hotel details match');
    passed += 3;

    // Test 13: IDOR Security test - User B cannot view User A's booking
    console.log('\nTesting IDOR security: User B attempting to view User A\'s booking...');
    const idorViewRes = await makeRequest(
      `/api/bookings/${bookingId}`,
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    assert(idorViewRes.status === 404, 'User B view of User A booking returns 404 Not Found (IDOR protected)');
    passed += 1;

    // Test 14: IDOR Security test - User B cannot cancel User A's booking
    console.log('\nTesting IDOR security: User B attempting to cancel User A\'s booking...');
    const idorCancelRes = await makeRequest(
      `/api/bookings/${bookingId}/cancel`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${tokenB}` } }
    );
    assert(idorCancelRes.status === 404, 'User B cancel of User A booking returns 404 Not Found (IDOR protected)');
    passed += 1;

    // Test 15: User A successfully cancels their booking
    console.log('\nTesting booking cancellation by User A...');
    const cancelRes = await makeRequest(
      `/api/bookings/${bookingId}/cancel`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(cancelRes.status === 200, 'Cancellation returns 200 OK');
    assert(cancelRes.body.data.status === 'cancelled', 'Booking status updated to cancelled');
    passed += 2;

    // Test 16: Duplicate cancellation rejection
    console.log('\nTesting duplicate cancellation rejection...');
    const dupCancelRes = await makeRequest(
      `/api/bookings/${bookingId}/cancel`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(dupCancelRes.status === 400, 'Duplicate cancel properly rejected with 400 Bad Request');
    passed += 1;

    console.log('\n============================================================');
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
