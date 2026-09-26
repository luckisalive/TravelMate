process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const app = require('../server');
const db = require('../config/db');

const TEST_PORT = 5003;
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
  console.log('🧪 Running Phase 5 Transport & Seat Booking Integration Tests');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;
  let emailA, emailB;

  try {
    server = app.listen(TEST_PORT);
    await new Promise((r) => setTimeout(r, 600));

    // Test 1: GET /api/transport/stations
    console.log('Testing GET /api/transport/stations...');
    const stationsRes = await makeRequest('/api/transport/stations');
    assert(stationsRes.status === 200, 'Stations endpoint returns 200 OK');
    assert(stationsRes.body.data.length >= 20, 'Stations list contains >= 20 transit hubs');
    passed += 2;

    // Test 2: Filter stations by type
    console.log('\nTesting GET /api/transport/stations?type=airport...');
    const airportsRes = await makeRequest('/api/transport/stations?type=airport');
    assert(airportsRes.status === 200, 'Airport stations filter returns 200 OK');
    assert(airportsRes.body.data.every((s) => s.type === 'airport'), 'All returned stations are airports');
    passed += 2;

    // Test 3: GET /api/transport (all options)
    console.log('\nTesting GET /api/transport listing & pagination...');
    const transportsRes = await makeRequest('/api/transport?limit=10');
    assert(transportsRes.status === 200, 'Transport list returns 200 OK');
    assert(transportsRes.body.data.transports.length > 0, 'Returns transports array');
    assert(transportsRes.body.data.pagination.total > 50, 'Total transport options > 50 in database');
    passed += 3;

    // Test 4: Mode filters (flight, train, bus)
    console.log('\nTesting GET /api/transport?mode=flight...');
    const flightsRes = await makeRequest('/api/transport?mode=flight&limit=5');
    assert(flightsRes.status === 200, 'Flight filter returns 200 OK');
    assert(flightsRes.body.data.transports.every((t) => t.mode === 'flight'), 'All results are flights');
    assert(flightsRes.body.data.transports[0].seats.has_seat_selection === true, 'Flights indicate seat selection available');
    passed += 3;

    console.log('\nTesting GET /api/transport?mode=train...');
    const trainsRes = await makeRequest('/api/transport?mode=train&limit=5');
    assert(trainsRes.status === 200, 'Train filter returns 200 OK');
    assert(trainsRes.body.data.transports.every((t) => t.mode === 'train'), 'All results are trains');
    passed += 2;

    console.log('\nTesting GET /api/transport?mode=bus...');
    const busesRes = await makeRequest('/api/transport?mode=bus&limit=5');
    assert(busesRes.status === 200, 'Bus filter returns 200 OK');
    assert(busesRes.body.data.transports.every((t) => t.mode === 'bus'), 'All results are buses');
    passed += 2;

    // Test 5: Route filtering (Origin BOM, Destination DEL)
    console.log('\nTesting GET /api/transport?origin=BOM&destination=DEL...');
    const routeRes = await makeRequest('/api/transport?origin=BOM&destination=DEL');
    assert(routeRes.status === 200, 'Route filter returns 200 OK');
    assert(
      routeRes.body.data.transports.every((t) => 
        (t.origin.code === 'BOM' || t.origin.city.toLowerCase() === 'mumbai') && 
        (t.destination.code === 'DEL' || t.destination.city.toLowerCase() === 'delhi')
      ),
      'All results originate in Mumbai/BOM and terminate in Delhi/DEL'
    );
    passed += 2;

    // Test 6: Sort by price_asc
    console.log('\nTesting GET /api/transport?sortBy=price_asc&limit=10...');
    const sortPriceRes = await makeRequest('/api/transport?sortBy=price_asc&limit=10');
    assert(sortPriceRes.status === 200, 'Sort price_asc returns 200 OK');
    const prices = sortPriceRes.body.data.transports.map((t) => t.price);
    const isSortedPrice = prices.every((val, i, arr) => !i || arr[i - 1] <= val);
    assert(isSortedPrice, 'Transports sorted in ascending order of price');
    passed += 2;

    // Test 7: Recommendation heuristic scoring
    console.log('\nTesting recommendations heuristic (style=cheapest vs comfort)...');
    const recRes = await makeRequest('/api/transport?sortBy=recommended&style=cheapest&origin=BOM&destination=DEL');
    assert(recRes.status === 200, 'Recommended sort returns 200 OK');
    const firstOption = recRes.body.data.transports[0];
    assert(firstOption.recommendation_score !== undefined, 'Contains recommendation_score');
    assert(firstOption.recommendation_reason !== undefined, 'Contains explainable recommendation_reason');
    assert(firstOption.outboundSearchUrls && (firstOption.outboundSearchUrls.googleFlights || firstOption.outboundSearchUrls.irctc || firstOption.outboundSearchUrls.redBus), 'Contains outbound platform comparison URLs');
    passed += 4;

    // Grab a flight for seat map and booking tests
    const sampleFlight = flightsRes.body.data.transports[0];
    console.log(`\nUsing Flight ID ${sampleFlight.id} (${sampleFlight.operator} ${sampleFlight.number}) for Seat Map tests...`);

    // Test 8: GET /api/transport/:id/seats
    console.log(`\nTesting GET /api/transport/${sampleFlight.id}/seats...`);
    const seatMapRes = await makeRequest(`/api/transport/${sampleFlight.id}/seats`);
    assert(seatMapRes.status === 200, 'Seat map returns 200 OK');
    assert(seatMapRes.body.data.seats.length === 180, 'Seat map contains 180 total seats (30 rows x 6 cols)');
    assert(seatMapRes.body.data.summary.total_seats === 180, 'Summary total_seats is 180');
    const firstSeat = seatMapRes.body.data.seats[0];
    assert(firstSeat.seat_no === '1A', 'First seat is 1A');
    assert(firstSeat.type === 'window', 'Seat 1A is window seat');
    assert(firstSeat.tier === 'Business', 'Row 1 is Business tier');
    passed += 6;

    // Setup Test Users
    console.log('\nSetting up test users for Transport Booking & Concurrency verification...');
    emailA = `test_trans_user_a_${Date.now()}@example.com`;
    emailB = `test_trans_user_b_${Date.now()}@example.com`;

    const regA = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Pilot User A',
      email: emailA,
      password: 'password123',
    });
    const tokenA = regA.body.token;

    const regB = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Pilot User B',
      email: emailB,
      password: 'password123',
    });
    const tokenB = regB.body.token;

    // Test 9: Unauthenticated transport booking rejection
    console.log('\nTesting unauthenticated POST /api/bookings/transport...');
    const unauthBooking = await makeRequest('/api/bookings/transport', { method: 'POST' }, {
      transport_id: sampleFlight.id,
      seat_no: '14B',
    });
    assert(unauthBooking.status === 401, 'Unauthenticated booking rejected with 401 Unauthorized');
    passed += 1;

    // Test 10: Missing seat_no for flight booking
    console.log('\nTesting flight booking without seat_no...');
    const noSeatBooking = await makeRequest(
      '/api/bookings/transport',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } },
      { transport_id: sampleFlight.id }
    );
    assert(noSeatBooking.status === 400, 'Flight booking without seat rejected with 400 Bad Request');
    passed += 1;

    // Test 11: Invalid seat_no
    console.log('\nTesting flight booking with invalid seat 99Z...');
    const invalidSeatBooking = await makeRequest(
      '/api/bookings/transport',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } },
      { transport_id: sampleFlight.id, seat_no: '99Z' }
    );
    assert(invalidSeatBooking.status === 404, 'Invalid seat rejected with 404 Not Found');
    passed += 1;

    // Find available seats dynamically to ensure repeatability
    const availableSeats = seatMapRes.body.data.seats.filter((s) => s.is_available);
    assert(availableSeats.length >= 5, 'Flight has available seats for testing');
    const targetSeat = availableSeats[0].seat_no;
    const raceSeat = availableSeats[1].seat_no;

    // Test 12: Successful flight booking with targetSeat
    console.log(`\nTesting successful flight booking for seat ${targetSeat}...`);
    const bookRes = await makeRequest(
      '/api/bookings/transport',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } },
      {
        transport_id: sampleFlight.id,
        seat_no: targetSeat,
        passenger_name: 'Pilot User A',
        currency: 'USD',
      }
    );

    assert(bookRes.status === 201, 'Flight booking created with 201 Created');
    const booking = bookRes.body.data.booking;
    assert(booking.seat_no === targetSeat, `Reserved seat matches ${targetSeat}`);
    assert(booking.reference_code.startsWith('TM-TRP-'), 'Reference code formatted as TM-TRP-XXXXXX');
    assert(booking.currency === 'USD', 'Currency stored as USD');
    assert(booking.amount_base === sampleFlight.price, 'amount_base equals transport price');
    assert(booking.rate_used > 0, 'rate_used recorded');
    passed += 6;

    const bookingId = booking.id;

    // Verify seat is now marked as booked in the seat map
    const seatMapAfter = await makeRequest(`/api/transport/${sampleFlight.id}/seats`);
    const bookedSeatEntry = seatMapAfter.body.data.seats.find((s) => s.seat_no === targetSeat);
    assert(bookedSeatEntry.is_booked === true, `Seat ${targetSeat} is now marked as booked in seat map`);
    assert(bookedSeatEntry.is_available === false, `Seat ${targetSeat} is no longer available`);
    passed += 2;

    // Test 13: Attempt to book already-booked seat (409 Conflict)
    console.log(`\nTesting duplicate booking for already-booked seat ${targetSeat}...`);
    const dupSeatRes = await makeRequest(
      '/api/bookings/transport',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } },
      {
        transport_id: sampleFlight.id,
        seat_no: targetSeat,
        passenger_name: 'Pilot User B',
      }
    );
    assert(dupSeatRes.status === 409, 'Duplicate seat booking rejected with 409 Conflict');
    passed += 1;

    // Test 14: CONCURRENCY RACE CONDITION TEST (ADR-005 & PRD Section 14)
    // Two simultaneous booking requests for raceSeat
    console.log(`\n🔥 CONCURRENCY TEST: Two simultaneous requests booking seat ${raceSeat}...`);
    const [raceRes1, raceRes2] = await Promise.all([
      makeRequest(
        '/api/bookings/transport',
        { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } },
        { transport_id: sampleFlight.id, seat_no: raceSeat, passenger_name: 'Racer 1' }
      ),
      makeRequest(
        '/api/bookings/transport',
        { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } },
        { transport_id: sampleFlight.id, seat_no: raceSeat, passenger_name: 'Racer 2' }
      ),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 201 && statuses[1] === 409,
      `Concurrency race condition handled: exactly one succeeded (201) and exactly one conflicted (409). Got: [${raceRes1.status}, ${raceRes2.status}]`
    );
    passed += 1;

    // Test 15: IDOR Protection on Transport Bookings
    console.log('\nTesting IDOR security: User B attempting to view User A\'s transport booking...');
    const idorViewRes = await makeRequest(
      `/api/bookings/${bookingId}`,
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    assert(idorViewRes.status === 404, 'User B view of User A transport booking returns 404 Not Found (IDOR protected)');
    passed += 1;

    console.log('\nTesting IDOR security: User B attempting to cancel User A\'s transport booking...');
    const idorCancelRes = await makeRequest(
      `/api/bookings/${bookingId}/cancel`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${tokenB}` } }
    );
    assert(idorCancelRes.status === 404, 'User B cancel of User A transport booking returns 404 Not Found (IDOR protected)');
    passed += 1;

    // Test 16: User A cancels transport booking -> Seat is released!
    console.log('\nTesting transport booking cancellation and seat release...');
    const cancelRes = await makeRequest(
      `/api/bookings/${bookingId}/cancel`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(cancelRes.status === 200, 'Cancellation returns 200 OK');
    assert(cancelRes.body.data.status === 'cancelled', 'Booking status updated to cancelled');
    passed += 2;

    // Verify seat is now released in the seat map
    const seatMapAfterCancel = await makeRequest(`/api/transport/${sampleFlight.id}/seats`);
    const releasedSeatEntry = seatMapAfterCancel.body.data.seats.find((s) => s.seat_no === targetSeat);
    assert(releasedSeatEntry.is_available === true, `Seat ${targetSeat} is released and available again in seat map`);
    passed += 1;

    // Test 17: Seat can be re-booked after cancellation
    console.log(`\nTesting re-booking released seat ${targetSeat} by User B...`);
    const rebookRes = await makeRequest(
      '/api/bookings/transport',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } },
      { transport_id: sampleFlight.id, seat_no: targetSeat, passenger_name: 'Pilot User B' }
    );
    assert(rebookRes.status === 201, 'Released seat successfully re-booked with 201 Created');
    passed += 1;

    // Test 18: Train booking
    console.log('\nTesting Train booking...');
    const sampleTrain = trainsRes.body.data.transports[0];
    const trainBookRes = await makeRequest(
      '/api/bookings/transport',
      { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } },
      {
        transport_id: sampleTrain.id,
        passenger_name: 'Train Traveler A',
      }
    );
    assert(trainBookRes.status === 201, 'Train booking created with 201 Created');
    assert(trainBookRes.body.data.transport.mode === 'train', 'Transport mode is train');
    passed += 2;

    // Test 19: User bookings list contains joined transport details
    console.log('\nTesting GET /api/bookings with transport joins...');
    const myBookingsRes = await makeRequest(
      '/api/bookings',
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(myBookingsRes.status === 200, 'My Bookings returns 200 OK');
    const myTransBooking = myBookingsRes.body.data.find((b) => b.type === 'transport');
    assert(myTransBooking !== undefined, 'User bookings list contains transport booking');
    assert(myTransBooking.transport && myTransBooking.transport.origin.city, 'Joined transport has origin city');
    passed += 3;

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
    try {
      if (emailA && emailB) {
        await db.query(`DELETE FROM users WHERE email IN ($1, $2)`, [emailA, emailB]);
      }
    } catch (e) {
      // Ignore cleanup error
    }
    await db.pool.end();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
