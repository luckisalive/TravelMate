process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const app = require('../server');
const db = require('../config/db');
const { getExchangeRate, convertToBase, convertFromBase } = require('../utils/currency');
const { fetchFrankfurterRates, syncExchangeRates } = require('../services/rateSyncService');

const TEST_PORT = 5010;
let server;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: encodeURI(path),
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
  console.log('🧪 Running Phase 10 Verification & Automated Testing Suite');
  console.log('============================================================\n');

  let passed = 0;
  const testRunId = Date.now();

  try {
    server = app.listen(TEST_PORT);
    await new Promise((r) => setTimeout(r, 600));

    // =========================================================================
    // SECTION 1: CONCURRENCY RACE CONDITION TESTS (Simultaneous Seat Bookings)
    // =========================================================================
    console.log('------------------------------------------------------------');
    console.log('1️⃣ Concurrency Test: Simultaneous Flight Seat Bookings (ADR-005)');
    console.log('------------------------------------------------------------');

    // 1.1 Register 2 distinct racers
    const racerEmail1 = `racer1_${testRunId}@test.com`;
    const racerEmail2 = `racer2_${testRunId}@test.com`;
    const racerEmail3 = `racer3_${testRunId}@test.com`;
    const racerEmail4 = `racer4_${testRunId}@test.com`;
    const racerEmail5 = `racer5_${testRunId}@test.com`;

    const [regR1, regR2, regR3, regR4, regR5] = await Promise.all([
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Racer 1', email: racerEmail1, password: 'Password123!' }),
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Racer 2', email: racerEmail2, password: 'Password123!' }),
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Racer 3', email: racerEmail3, password: 'Password123!' }),
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Racer 4', email: racerEmail4, password: 'Password123!' }),
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Racer 5', email: racerEmail5, password: 'Password123!' }),
    ]);

    const tokenR1 = regR1.body.token;
    const tokenR2 = regR2.body.token;
    const tokenR3 = regR3.body.token;
    const tokenR4 = regR4.body.token;
    const tokenR5 = regR5.body.token;

    assert(tokenR1 && tokenR2, 'Racer test users registered successfully');
    passed++;

    // 1.2 Find an active flight with available seats
    const flightSearch = await makeRequest('/api/transport?mode=flight&limit=1');
    assert(flightSearch.status === 200 && flightSearch.body.data.transports.length > 0, 'Flight options found in database');
    passed++;

    const targetFlight = flightSearch.body.data.transports[0];

    // Find 2 currently unbooked seats for this flight
    const seatMapRes = await makeRequest(`/api/transport/${targetFlight.id}/seats`);
    assert(seatMapRes.status === 200, 'Flight seat map endpoint returns 200 OK');
    passed++;

    const availableSeats = seatMapRes.body.data.seats.filter((s) => s.is_available);
    assert(availableSeats.length >= 2, 'Flight has at least 2 available seats for race testing');
    passed++;

    const testSeat1 = availableSeats[0].seat_no;
    const testSeat2 = availableSeats[1].seat_no;
    console.log(`\nSelected target seats for race tests: [${testSeat1}, ${testSeat2}] on Flight ${targetFlight.number}`);

    // 1.3 RACE CONDITION 1: Exactly 2 simultaneous booking requests for testSeat1
    console.log(`\n🏁 Race 1: Two simultaneous requests competing for seat ${testSeat1}...`);
    const [raceRes1, raceRes2] = await Promise.all([
      makeRequest('/api/bookings/transport', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenR1}` },
      }, { transport_id: targetFlight.id, seat_no: testSeat1, passenger_name: 'Racer 1' }),
      makeRequest('/api/bookings/transport', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenR2}` },
      }, { transport_id: targetFlight.id, seat_no: testSeat1, passenger_name: 'Racer 2' }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(statuses[0] === 201 && statuses[1] === 409, 
      `Atomic seat lock: exactly one request succeeded (201) and one conflicted (409). Got: [${raceRes1.status}, ${raceRes2.status}]`);
    passed++;

    const winningRes = raceRes1.status === 201 ? raceRes1 : raceRes2;
    const losingRes = raceRes1.status === 409 ? raceRes1 : raceRes2;
    const winningBookingId = winningRes.body.data.booking.id;

    assert(winningRes.body.data.booking.status === 'confirmed', 'Winning booking confirmed');
    assert(losingRes.body.error && losingRes.body.error.message.includes('already booked'), 'Conflicted request returns descriptive 409 message');
    passed += 2;

    // 1.4 Post-race database verification
    const dbSeatCheck = await db.query(
      'SELECT id, seat_no, booking_id FROM seats WHERE transport_id = $1 AND seat_no = $2',
      [targetFlight.id, testSeat1]
    );
    assert(dbSeatCheck.rows.length === 1, 'Seat record exists in database');
    assert(dbSeatCheck.rows[0].booking_id === winningBookingId, 'Database seat booking_id points precisely to winning booking ID');
    passed += 2;

    // 1.5 Subsequent booking attempt for same seat must also fail with 409
    const lateBooking = await makeRequest('/api/bookings/transport', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenR3}` },
    }, { transport_id: targetFlight.id, seat_no: testSeat1, passenger_name: 'Late Racer' });
    assert(lateBooking.status === 409, 'Subsequent booking for reserved seat blocked with 409 Conflict');
    passed++;

    // 1.6 RACE CONDITION 2: 5-way simultaneous burst for testSeat2
    console.log(`\n🏁 Race 2: 5 simultaneous requests competing for seat ${testSeat2}...`);
    const burstPromises = [
      makeRequest('/api/bookings/transport', { method: 'POST', headers: { Authorization: `Bearer ${tokenR1}` } }, { transport_id: targetFlight.id, seat_no: testSeat2, passenger_name: 'Burst 1' }),
      makeRequest('/api/bookings/transport', { method: 'POST', headers: { Authorization: `Bearer ${tokenR2}` } }, { transport_id: targetFlight.id, seat_no: testSeat2, passenger_name: 'Burst 2' }),
      makeRequest('/api/bookings/transport', { method: 'POST', headers: { Authorization: `Bearer ${tokenR3}` } }, { transport_id: targetFlight.id, seat_no: testSeat2, passenger_name: 'Burst 3' }),
      makeRequest('/api/bookings/transport', { method: 'POST', headers: { Authorization: `Bearer ${tokenR4}` } }, { transport_id: targetFlight.id, seat_no: testSeat2, passenger_name: 'Burst 4' }),
      makeRequest('/api/bookings/transport', { method: 'POST', headers: { Authorization: `Bearer ${tokenR5}` } }, { transport_id: targetFlight.id, seat_no: testSeat2, passenger_name: 'Burst 5' }),
    ];

    const burstResults = await Promise.all(burstPromises);
    const burstSuccessCount = burstResults.filter((r) => r.status === 201).length;
    const burstConflictCount = burstResults.filter((r) => r.status === 409).length;

    assert(burstSuccessCount === 1, `5-client burst: exactly 1 request succeeded (got ${burstSuccessCount})`);
    assert(burstConflictCount === 4, `5-client burst: exactly 4 requests received 409 Conflict (got ${burstConflictCount})`);
    passed += 2;

    // 1.7 RACE CONDITION 3: Seat Release & Re-booking Race
    console.log(`\n🏁 Race 3: Cancelling booking for ${testSeat1} and racing 2 clients to re-book it...`);
    const cancelRes = await makeRequest(`/api/bookings/${winningBookingId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${winningRes === raceRes1 ? tokenR1 : tokenR2}` },
    });
    assert(cancelRes.status === 200, 'Winning booking cancelled successfully');
    assert(cancelRes.body.data.status === 'cancelled', 'Booking marked cancelled');
    passed += 2;

    // Check seat released in DB
    const releasedSeatCheck = await db.query(
      'SELECT booking_id FROM seats WHERE transport_id = $1 AND seat_no = $2',
      [targetFlight.id, testSeat1]
    );
    assert(releasedSeatCheck.rows[0].booking_id === null, 'Seat booking_id returned to NULL upon cancellation');
    passed++;

    // Two simultaneous re-bookers
    const [rebook1, rebook2] = await Promise.all([
      makeRequest('/api/bookings/transport', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenR4}` },
      }, { transport_id: targetFlight.id, seat_no: testSeat1, passenger_name: 'Rebooker 4' }),
      makeRequest('/api/bookings/transport', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenR5}` },
      }, { transport_id: targetFlight.id, seat_no: testSeat1, passenger_name: 'Rebooker 5' }),
    ]);

    const rebookStatuses = [rebook1.status, rebook2.status].sort();
    assert(rebookStatuses[0] === 201 && rebookStatuses[1] === 409, 
      `Rebooking race condition handled: exactly 1 succeeded (201) and 1 conflicted (409)`);
    passed++;


    // =========================================================================
    // SECTION 2: IDOR SECURITY & AUTHORIZATION TESTS
    // =========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('2️⃣ IDOR Security Tests: Unauthorized Resource Access (ADR-010)');
    console.log('------------------------------------------------------------');

    // 2.1 Set up Alice (Resource Owner) & Bob (Attacker / Unauthorized User)
    const emailAlice = `alice_idor_${testRunId}@test.com`;
    const emailBob = `bob_idor_${testRunId}@test.com`;

    const [regAlice, regBob] = await Promise.all([
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Alice Owner', email: emailAlice, password: 'Password123!' }),
      makeRequest('/api/auth/register', { method: 'POST' }, { name: 'Bob Outsider', email: emailBob, password: 'Password123!' }),
    ]);

    const tokenAlice = regAlice.body.token;
    const tokenBob = regBob.body.token;
    assert(tokenAlice && tokenBob, 'Alice and Bob registered successfully');
    passed++;

    // Alice creates a private trip
    const aliceTripRes = await makeRequest('/api/trips', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    }, {
      name: "Alice's Secret Vacation",
      start_date: '2026-10-01',
      end_date: '2026-10-08',
      budget: 50000,
    });
    assert(aliceTripRes.status === 201, "Alice creates private trip with 201 Created");
    const tripAliceId = aliceTripRes.body.data.id;
    passed++;

    // Alice adds a hotel booking
    const hotelList = await makeRequest('/api/hotels?limit=1');
    const targetHotel = hotelList.body.data.hotels[0];
    const aliceHotelBookRes = await makeRequest('/api/bookings/hotel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    }, {
      hotel_id: targetHotel.id,
      trip_id: tripAliceId,
      check_in: '2026-10-01',
      check_out: '2026-10-04',
      rooms: 1,
    });
    assert(aliceHotelBookRes.status === 201, "Alice creates hotel booking with 201 Created");
    const bookingAliceId = aliceHotelBookRes.body.data.booking.id;
    passed++;

    // Alice logs an expense in her trip
    const aliceExpenseRes = await makeRequest(`/api/trips/${tripAliceId}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    }, {
      description: 'Private Dinner with Wine',
      amount: 4500,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-02',
    });
    assert(aliceExpenseRes.status === 201, "Alice logs private expense with 201 Created");
    const expenseAliceId = aliceExpenseRes.body.data.id;
    passed++;

    // Alice adds an itinerary item
    const aliceItinRes = await makeRequest(`/api/trips/${tripAliceId}/itinerary`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    }, {
      day_number: 1,
      time: '19:00',
      title: 'Confidential Business Dinner',
    });
    assert(aliceItinRes.status === 201, "Alice creates itinerary activity with 201 Created");
    const itinAliceId = aliceItinRes.body.data.id;
    passed++;

    // Alice creates a notification
    const aliceNotifRes = await db.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'general', 'Secret code 1234') RETURNING id`,
      [regAlice.body.user.id]
    );
    const notifAliceId = aliceNotifRes.rows[0].id;

    // 2.2 BOB'S UNAUTHORIZED IDOR ATTACK ATTEMPTS
    console.log('\n🔒 Testing IDOR access controls with unauthorized user Bob...');

    // A. Trip Read / Update / Delete IDOR
    const bobTripGet = await makeRequest(`/api/trips/${tripAliceId}`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobTripGet.status === 404, 'IDOR Trip Read: Bob blocked with 404 Not Found');
    passed++;

    const bobTripPut = await makeRequest(`/api/trips/${tripAliceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { name: "Bob Hijacked This Trip" });
    assert(bobTripPut.status === 403 || bobTripPut.status === 404, 'IDOR Trip Update: Bob blocked with 403/404');
    passed++;

    const bobTripDel = await makeRequest(`/api/trips/${tripAliceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobTripDel.status === 403 || bobTripDel.status === 404, 'IDOR Trip Delete: Bob blocked with 403/404');
    passed++;

    const bobTripMembersPost = await makeRequest(`/api/trips/${tripAliceId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { email: 'intruder@test.com' });
    assert(bobTripMembersPost.status === 403 || bobTripMembersPost.status === 404, 'IDOR Trip Invite: Bob blocked from inviting members');
    passed++;

    // B. Balances & Financials IDOR
    const bobBalancesGet = await makeRequest(`/api/trips/${tripAliceId}/balances`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobBalancesGet.status === 404, 'IDOR Balances: Bob blocked with 404 Not Found');
    passed++;

    const bobAnalyticsGet = await makeRequest(`/api/trips/${tripAliceId}/expenses/analytics`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobAnalyticsGet.status === 404, 'IDOR Analytics: Bob blocked with 404 Not Found');
    passed++;

    // C. Itinerary IDOR
    const bobItinGet = await makeRequest(`/api/trips/${tripAliceId}/itinerary`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobItinGet.status === 404, 'IDOR Itinerary Read: Bob blocked with 404 Not Found');
    passed++;

    const bobItinPost = await makeRequest(`/api/trips/${tripAliceId}/itinerary`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { day_number: 1, title: 'Intruder activity' });
    assert(bobItinPost.status === 404, 'IDOR Itinerary Create: Bob blocked with 404 Not Found');
    passed++;

    const bobItinPut = await makeRequest(`/api/trips/${tripAliceId}/itinerary/${itinAliceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { title: 'Modified by Bob' });
    assert(bobItinPut.status === 404, 'IDOR Itinerary Modify: Bob blocked with 404 Not Found');
    passed++;

    const bobItinDel = await makeRequest(`/api/trips/${tripAliceId}/itinerary/${itinAliceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobItinDel.status === 404, 'IDOR Itinerary Delete: Bob blocked with 404 Not Found');
    passed++;

    // D. Expense IDOR
    const bobExpensesGet = await makeRequest(`/api/trips/${tripAliceId}/expenses`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobExpensesGet.status === 404, 'IDOR Expenses List: Bob blocked with 404 Not Found');
    passed++;

    const bobExpensePost = await makeRequest(`/api/trips/${tripAliceId}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { description: 'Bob Fake Expense', amount: 500, currency: 'INR', category: 'Food' });
    assert(bobExpensePost.status === 404, 'IDOR Expense Create: Bob blocked with 404 Not Found');
    passed++;

    const bobExpenseSingleGet = await makeRequest(`/api/trips/${tripAliceId}/expenses/${expenseAliceId}`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobExpenseSingleGet.status === 404, 'IDOR Single Expense Read: Bob blocked with 404 Not Found');
    passed++;

    const bobExpensePut = await makeRequest(`/api/trips/${tripAliceId}/expenses/${expenseAliceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { amount: 1 });
    assert(bobExpensePut.status === 404, 'IDOR Expense Update: Bob blocked with 404 Not Found');
    passed++;

    const bobExpenseDel = await makeRequest(`/api/trips/${tripAliceId}/expenses/${expenseAliceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobExpenseDel.status === 404, 'IDOR Expense Delete: Bob blocked with 404 Not Found');
    passed++;

    // E. Booking IDOR
    const bobBookingGet = await makeRequest(`/api/bookings/${bookingAliceId}`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobBookingGet.status === 404, 'IDOR Booking Read: Bob blocked with 404 Not Found');
    passed++;

    const bobBookingCancel = await makeRequest(`/api/bookings/${bookingAliceId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobBookingCancel.status === 404, 'IDOR Booking Cancel: Bob blocked with 404 Not Found');
    passed++;

    const bobBookingComplete = await makeRequest(`/api/bookings/${bookingAliceId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobBookingComplete.status === 404, 'IDOR Booking Complete: Bob blocked with 404 Not Found');
    passed++;

    const bobBookingReview = await makeRequest('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, { booking_id: bookingAliceId, rating: 1, comment: 'Attacker Fake Review' });
    assert(bobBookingReview.status === 404, 'IDOR Review on Booking: Bob blocked with 404 Not Found');
    passed++;

    // F. Notification IDOR
    const bobNotifRead = await makeRequest(`/api/notifications/${notifAliceId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobNotifRead.status === 404, 'IDOR Notification Read: Bob blocked with 404 Not Found');
    passed++;

    const bobNotifDel = await makeRequest(`/api/notifications/${notifAliceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    assert(bobNotifDel.status === 404, 'IDOR Notification Delete: Bob blocked with 404 Not Found');
    passed++;

    // G. Settlement IDOR
    const bobSettlementPost = await makeRequest('/api/settlements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBob}` },
    }, {
      trip_id: tripAliceId,
      to_user_id: regAlice.body.user.id,
      amount: 100,
    });
    assert(bobSettlementPost.status === 404, 'IDOR Settlement Create: Bob blocked with 404 Not Found');
    passed++;


    // =========================================================================
    // SECTION 3: SQL INJECTION RESILIENCE & SANITIZATION
    // =========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('3️⃣ SQL Injection Resilience & Input Sanitization');
    console.log('------------------------------------------------------------');

    // 3.1 SQL Injection in Hotel search
    const sqlInjHotelCity = await makeRequest("/api/hotels?city=' OR '1'='1");
    assert(sqlInjHotelCity.status === 200, "Hotel city filter with ' OR '1'='1 safely handles input (HTTP 200)");
    assert(Array.isArray(sqlInjHotelCity.body.data.hotels), "Response body is valid array");
    passed += 2;

    const sqlInjHotelSearch = await makeRequest("/api/hotels?search='; DROP TABLE users; --");
    assert(sqlInjHotelSearch.status === 200, "Hotel search with '; DROP TABLE users; -- returns HTTP 200 without executing injection");
    passed++;

    // 3.2 SQL Injection in Transport search
    const sqlInjTransport = await makeRequest("/api/transport?origin=' OR 1=1 --&destination=DEL");
    assert(sqlInjTransport.status === 200, "Transport search with SQL injection string safely returns HTTP 200");
    passed++;

    // 3.3 Verify database integrity after injection attempts
    const dbIntegrityCheck = await db.query("SELECT COUNT(*) AS count FROM users");
    assert(parseInt(dbIntegrityCheck.rows[0].count, 10) > 0, "Users table intact and undamaged after SQL injection payloads");
    passed++;


    // =========================================================================
    // SECTION 4: CURRENCY CONVERSION & STALE RATE FALLBACK (Money Tests)
    // =========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('4️⃣ Currency Conversion, Rounding & Stale Rate Fallback Tests');
    console.log('------------------------------------------------------------');

    // 4.1 Base currency INR conversion & precision
    const inrConv = await convertToBase(1500.555, 'INR');
    assert(inrConv.currency === 'INR', 'convertToBase INR returns currency INR');
    assert(inrConv.rate_used === 1.0, 'convertToBase INR rate_used is exactly 1.0');
    assert(inrConv.amount === 1500.56 || inrConv.amount === 1500.55, 'Amount correctly rounded to 2 decimal places');
    assert(inrConv.amount_base === inrConv.amount, 'amount_base equals amount for base currency');
    passed += 4;

    // 4.2 Negative and non-numeric validation
    let negErrCaught = false;
    try {
      await convertToBase(-100, 'INR');
    } catch (e) {
      negErrCaught = true;
    }
    assert(negErrCaught, 'Negative amount rejected with error');
    passed++;

    let nonNumErrCaught = false;
    try {
      await convertToBase('invalid_amount', 'INR');
    } catch (e) {
      nonNumErrCaught = true;
    }
    assert(nonNumErrCaught, 'Non-numeric amount rejected with error');
    passed++;

    // 4.3 convertFromBase calculations
    const displayInr = await convertFromBase(2000, 'INR');
    assert(displayInr.amount === 2000.0, 'convertFromBase INR returns same amount');
    assert(displayInr.rate_used === 1.0, 'convertFromBase INR rate is 1.0');
    passed += 2;

    const displayUsd = await convertFromBase(2000, 'USD');
    assert(displayUsd.currency === 'USD', 'convertFromBase USD returns currency USD');
    assert(displayUsd.amount > 0, 'convertFromBase USD returns positive amount');
    assert(displayUsd.rate_used > 0, 'convertFromBase USD uses valid rate');
    passed += 3;

    // 4.4 Same-Currency Case (PRD Section 14)
    console.log('\nTesting same-currency booking and expense behavior...');
    const inrExpense = await makeRequest(`/api/trips/${tripAliceId}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    }, {
      description: 'INR Auto-Match Expense',
      amount: 1000,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-03',
    });
    assert(inrExpense.status === 201, 'INR Expense created with 201 Created');
    assert(parseFloat(inrExpense.body.data.amount) === parseFloat(inrExpense.body.data.amount_base), 'INR Expense: amount === amount_base');
    assert(parseFloat(inrExpense.body.data.rate_used) === 1.0, 'INR Expense: rate_used === 1.0');
    passed += 3;

    // 4.5 Foreign currency booking with immutable snapshot
    const usdExpense = await makeRequest(`/api/trips/${tripAliceId}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    }, {
      description: 'USD Souvenirs',
      amount: 50,
      currency: 'USD',
      category: 'Shopping',
      date: '2026-10-03',
    });
    assert(usdExpense.status === 201, 'USD Expense created with 201 Created');
    assert(usdExpense.body.data.currency === 'USD', 'USD Expense currency is USD');
    assert(parseFloat(usdExpense.body.data.rate_used) > 0, 'USD Expense rate_used is positive number');
    const calculatedBase = parseFloat((50 / parseFloat(usdExpense.body.data.rate_used)).toFixed(2));
    assert(Math.abs(parseFloat(usdExpense.body.data.amount_base) - calculatedBase) <= 0.05, 
      `Immutable accounting: amount_base (${usdExpense.body.data.amount_base}) matches amount / rate_used (${calculatedBase})`);
    passed += 4;

    // 4.6 Stale rate fallback & pegged currency testing
    console.log('\nTesting stale rate fallback and offline rate recovery...');
    const fallbackRate = await getExchangeRate('EUR');
    assert(typeof fallbackRate === 'number' && fallbackRate > 0, 'EUR exchange rate resolved to valid number');
    passed++;

    const aedRate = await getExchangeRate('AED');
    const usdRate = await getExchangeRate('USD');
    const expectedAed = parseFloat((usdRate * 3.6725).toFixed(6));
    assert(Math.abs(aedRate - expectedAed) <= 0.001, 'AED pegged rate correctly computed against USD (USD * 3.6725)');
    passed++;

    // 4.7 Frankfurter sync service resilience
    const rateSyncResult = await syncExchangeRates();
    assert(rateSyncResult.success === true, 'syncExchangeRates() executes successfully');
    assert(rateSyncResult.insertedCount >= 5, 'Exchange rates synced/updated in database table');
    passed += 2;

    console.log('\n============================================================');
    console.log(`🎉 Phase 10 Verification Suite Completed: ${passed} Passed, 0 Failed`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ Phase 10 Tests Terminated with Error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await db.pool.end();
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
