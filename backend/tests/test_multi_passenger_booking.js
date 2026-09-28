const assert = require('assert');
const http = require('http');
const app = require('../server');
const db = require('../config/db');

let server;
let baseUrl;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 Testing Multi-Passenger Booking & Trip Linkage');
  console.log('============================================================\n');

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. Register a test user
    const testEmail = `multipass_${Date.now()}@travelmate.test`;
    const regRes = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Travel Planner User',
      email: testEmail,
      password: 'Password123!',
      currency_pref: 'INR',
    });

    assert.strictEqual(regRes.status, 201, 'User registration should succeed');
    const token = regRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('  ✅ PASS: Test user registered successfully');

    // 2. Create a trip
    const tripRes = await makeRequest('/api/trips', { method: 'POST', headers: authHeaders }, {
      name: 'Shimla Summer Holiday',
      start_date: '2026-10-10',
      end_date: '2026-10-18',
      budget: 50000,
      base_currency: 'INR',
    });
    assert.strictEqual(tripRes.status, 201, 'Trip creation should succeed');
    const tripId = tripRes.body.data.id;
    console.log(`  ✅ PASS: Trip created successfully (Trip ID: ${tripId})`);

    // Verify empty bookings in trip doesn't fail
    const tripDetailEmpty = await makeRequest(`/api/trips/${tripId}`, { headers: authHeaders });
    assert.strictEqual(tripDetailEmpty.status, 200, 'Empty trip details should return 200');
    assert.strictEqual(tripDetailEmpty.body.data.bookings.length, 0, 'Should have 0 bookings initially');
    console.log('  ✅ PASS: Empty trip details retrieved without errors');

    // 3. Find a train transport option
    const trainRes = await makeRequest('/api/transport?mode=train&limit=5');
    assert.strictEqual(trainRes.status, 200);
    assert(trainRes.body.data.transports.length > 0, 'Should find at least 1 train');
    const train = trainRes.body.data.transports[0];

    // 4. Book multi-passenger train tickets attached to the trip
    const trainBookingRes = await makeRequest('/api/bookings/transport', { method: 'POST', headers: authHeaders }, {
      transport_id: train.id,
      trip_id: tripId,
      passengers: [
        { name: 'Travel Planner User' },
        { name: 'Alice Walker' },
        { name: 'Bob Smith' },
      ],
      currency: 'INR',
    });

    assert.strictEqual(trainBookingRes.status, 201, 'Multi-passenger train booking should succeed');
    assert.strictEqual(trainBookingRes.body.data.total_passengers, 3, 'Should book for 3 passengers');
    assert.strictEqual(trainBookingRes.body.data.bookings.length, 3, 'Should create 3 booking records');
    assert.strictEqual(trainBookingRes.body.data.trip_id, tripId, 'Should link to the chosen trip');
    console.log('  ✅ PASS: Multi-passenger train booking (3 passengers) linked to chosen trip');

    // 5. Find a flight transport option and available seats
    const flightRes = await makeRequest('/api/transport?mode=flight&limit=5');
    assert.strictEqual(flightRes.status, 200);
    assert(flightRes.body.data.transports.length > 0, 'Should find at least 1 flight');
    const flight = flightRes.body.data.transports[0];

    const seatsRes = await makeRequest(`/api/transport/${flight.id}/seats`);
    assert.strictEqual(seatsRes.status, 200);
    const availableSeats = seatsRes.body.data.seats.filter(s => !s.is_booked);
    assert(availableSeats.length >= 2, 'Should have at least 2 available seats');
    const seat1 = availableSeats[0].seat_no;
    const seat2 = availableSeats[1].seat_no;

    // 6. Test duplicate seat rejection in single request
    const dupRes = await makeRequest('/api/bookings/transport', { method: 'POST', headers: authHeaders }, {
      transport_id: flight.id,
      trip_id: tripId,
      passengers: [
        { name: 'Passenger A', seat_no: seat1 },
        { name: 'Passenger B', seat_no: seat1 },
      ],
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate seat in request should be rejected');
    console.log('  ✅ PASS: Duplicate seat selection in same request rejected with 400');

    // 7. Book multi-passenger flight with distinct seats attached to the trip
    const flightBookingRes = await makeRequest('/api/bookings/transport', { method: 'POST', headers: authHeaders }, {
      transport_id: flight.id,
      trip_id: tripId,
      passengers: [
        { name: 'John Doe', seat_no: seat1 },
        { name: 'Jane Doe', seat_no: seat2 },
      ],
      currency: 'INR',
    });

    assert.strictEqual(flightBookingRes.status, 201, 'Multi-passenger flight booking should succeed');
    assert.strictEqual(flightBookingRes.body.data.total_passengers, 2);
    assert.strictEqual(flightBookingRes.body.data.bookings.length, 2);
    assert.strictEqual(flightBookingRes.body.data.trip_id, tripId);
    console.log(`  ✅ PASS: Multi-seat flight booking confirmed (${seat1} for John Doe, ${seat2} for Jane Doe)`);

    // 8. Verify GET /api/trips/:id contains all bookings with passenger names and seats
    const tripDetailAfter = await makeRequest(`/api/trips/${tripId}`, { headers: authHeaders });
    assert.strictEqual(tripDetailAfter.status, 200);
    const tripBookings = tripDetailAfter.body.data.bookings;
    assert.strictEqual(tripBookings.length, 5, 'Should have 3 train + 2 flight bookings = 5 total');

    const names = tripBookings.map(b => b.passenger_name);
    assert(names.includes('Travel Planner User'), 'Should include lead user');
    assert(names.includes('Alice Walker'), 'Should include Alice');
    assert(names.includes('Bob Smith'), 'Should include Bob');
    assert(names.includes('John Doe'), 'Should include John Doe');
    assert(names.includes('Jane Doe'), 'Should include Jane Doe');

    const bookedSeats = tripBookings.filter(b => b.transport_mode === 'flight').map(b => b.seat_no);
    assert(bookedSeats.includes(seat1), `Should include seat ${seat1}`);
    assert(bookedSeats.includes(seat2), `Should include seat ${seat2}`);
    console.log('  ✅ PASS: GET /api/trips/:id returns all 5 bookings with passenger names and seats');

    // 9. Verify GET /api/bookings returns passenger_name
    const myBookingsRes = await makeRequest('/api/bookings', { headers: authHeaders });
    assert.strictEqual(myBookingsRes.status, 200);
    assert.strictEqual(myBookingsRes.body.data.length, 5);
    myBookingsRes.body.data.forEach(b => {
      assert(b.passenger_name, 'Booking should include passenger_name');
    });
    console.log('  ✅ PASS: GET /api/bookings includes passenger_name on all records');

    console.log('\n============================================================');
    console.log('🎉 All Multi-Passenger & Trip Booking Tests Passed!');
    console.log('============================================================');
    process.exit(0);
  } finally {
    if (server) server.close();
    await db.pool.end();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
