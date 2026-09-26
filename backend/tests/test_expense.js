process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const app = require('../server');
const db = require('../config/db');
const { convertToBase, getExchangeRate } = require('../utils/currency');

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
  console.log('🧪 Running Phase 6 Expense Manager & Dual-Currency Tests');
  console.log('============================================================\n');

  let passedCount = 0;
  const countAssert = (cond, msg) => {
    assert(cond, msg);
    passedCount++;
  };

  try {
    // Start HTTP server on isolated test port
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        resolve();
      });
    });

    // -------------------------------------------------------------
    // Test Block 1: Currency Conversion Utility (ADR-004)
    // -------------------------------------------------------------
    console.log('Testing Currency Conversion Utility...');
    const inrConv = await convertToBase(5000, 'INR');
    countAssert(inrConv.amount === 5000, 'INR conversion preserves original amount');
    countAssert(inrConv.amount_base === 5000, 'INR conversion sets amount_base = amount');
    countAssert(inrConv.rate_used === 1.0, 'INR conversion sets rate_used = 1.0');

    const usdConv = await convertToBase(100, 'USD');
    countAssert(usdConv.amount === 100, 'USD conversion preserves original amount');
    countAssert(usdConv.currency === 'USD', 'USD conversion preserves currency');
    countAssert(usdConv.rate_used > 0, 'USD conversion finds non-zero exchange rate');
    const expectedBase = parseFloat((100 / usdConv.rate_used).toFixed(2));
    countAssert(Math.abs(usdConv.amount_base - expectedBase) < 0.05, 'USD amount_base matches amount / rate_used');

    let invalidThrew = false;
    try {
      await convertToBase(-50, 'INR');
    } catch (e) {
      invalidThrew = true;
    }
    countAssert(invalidThrew, 'Negative amounts rejected by convertToBase');

    // -------------------------------------------------------------
    // Test Block 2: Rates Endpoints & Background Sync
    // -------------------------------------------------------------
    console.log('\nTesting Rate Sync & Rates API...');
    const syncRes = await makeRequest('/api/rates/sync', { method: 'POST' });
    countAssert(syncRes.status === 200, 'POST /api/rates/sync returns 200 OK');
    countAssert(syncRes.body.success === true, 'Rate sync returns success: true');
    countAssert(syncRes.body.data?.insertedCount > 0, 'Rate sync inserted rates into database');

    const ratesRes = await makeRequest('/api/rates');
    countAssert(ratesRes.status === 200, 'GET /api/rates returns 200 OK');
    countAssert(ratesRes.body.rates?.INR === 1.0, 'Rates contains INR = 1.0');
    countAssert(typeof ratesRes.body.rates?.USD === 'number', 'Rates contains numeric USD rate');

    // -------------------------------------------------------------
    // Test Block 3: User Setup & Authentication
    // -------------------------------------------------------------
    console.log('\nSetting up test users...');
    const timestamp = Date.now();
    const userAEmail = `expense_a_${timestamp}@example.com`;
    const userBEmail = `expense_b_${timestamp}@example.com`;
    const userCEmail = `expense_c_${timestamp}@example.com`;

    const regA = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Alice Payer',
      email: userAEmail,
      password: 'Password123!',
      currency_pref: 'INR',
      display_currency: 'USD',
    });
    countAssert(regA.status === 201, 'User A registered with 201 Created');
    const tokenA = regA.body.token;
    const userAId = regA.body.user.id;

    const regB = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Bob Outsider',
      email: userBEmail,
      password: 'Password123!',
    });
    countAssert(regB.status === 201, 'User B registered with 201 Created');
    const tokenB = regB.body.token;
    const userBId = regB.body.user.id;

    const regC = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Charlie Companion',
      email: userCEmail,
      password: 'Password123!',
    });
    countAssert(regC.status === 201, 'User C registered with 201 Created');
    const tokenC = regC.body.token;
    const userCId = regC.body.user.id;

    const authHeadersA = { headers: { Authorization: `Bearer ${tokenA}` } };
    const authHeadersB = { headers: { Authorization: `Bearer ${tokenB}` } };
    const authHeadersC = { headers: { Authorization: `Bearer ${tokenC}` } };

    // -------------------------------------------------------------
    // Test Block 4: Trip CRUD & Validation
    // -------------------------------------------------------------
    console.log('\nTesting Trip CRUD & Validations...');
    const unauthTrips = await makeRequest('/api/trips');
    countAssert(unauthTrips.status === 401, 'Unauthenticated GET /api/trips rejected with 401');

    // Invalid trip creation: end_date < start_date
    const invalidTrip = await makeRequest('/api/trips', { method: 'POST', ...authHeadersA }, {
      name: 'Invalid Dates Trip',
      start_date: '2026-12-10',
      end_date: '2026-12-01',
      budget: 10000,
    });
    countAssert(invalidTrip.status === 400, 'Trip with end_date < start_date rejected with 400 Bad Request');

    // Valid trip creation
    const createTripRes = await makeRequest('/api/trips', { method: 'POST', ...authHeadersA }, {
      name: 'Goa Holiday Trip',
      start_date: '2026-11-01',
      end_date: '2026-11-07',
      budget: 50000,
      base_currency: 'INR',
    });
    countAssert(createTripRes.status === 201, 'Trip created with 201 Created');
    const tripId = createTripRes.body.data.id;
    countAssert(tripId > 0, 'Created trip has positive integer ID');
    countAssert(createTripRes.body.data.budget === 50000, 'Trip budget recorded as 50000');
    countAssert(createTripRes.body.data.role === 'owner', 'Trip creator assigned owner role');

    // List trips for User A
    const listTripsRes = await makeRequest('/api/trips', authHeadersA);
    countAssert(listTripsRes.status === 200, 'GET /api/trips returns 200 OK');
    const foundTrip = listTripsRes.body.data.find((t) => t.id === tripId);
    countAssert(!!foundTrip, 'Created trip present in user trip list');
    countAssert(foundTrip.duration_days === 7, 'Duration days correctly calculated as 7');

    // Update trip settings (budget change)
    const updateTripRes = await makeRequest(`/api/trips/${tripId}`, { method: 'PUT', ...authHeadersA }, {
      budget: 60000,
      name: 'Goa Sun & Sand Trip',
    });
    countAssert(updateTripRes.status === 200, 'PUT /api/trips/:id returns 200 OK');
    countAssert(updateTripRes.body.data.budget === 60000, 'Updated budget is 60000');
    countAssert(updateTripRes.body.data.name === 'Goa Sun & Sand Trip', 'Updated name is Goa Sun & Sand Trip');

    // Add Charlie as a trip member
    const addMemberRes = await makeRequest(`/api/trips/${tripId}/members`, { method: 'POST', ...authHeadersA }, {
      email: userCEmail,
      role: 'member',
    });
    countAssert(addMemberRes.status === 201, 'Companion User C successfully added to trip with 201 Created');

    // -------------------------------------------------------------
    // Test Block 5: Server-Side Expense Logging & Conversions (ADR-004)
    // -------------------------------------------------------------
    console.log('\nTesting Expense Logging & Dual-Currency Engine...');

    // Expense 1: INR Food expense
    const expFood = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Food',
      amount: 4500,
      currency: 'INR',
      date: '2026-11-02',
      note: 'Dinner at Fisherman Wharf',
    });
    countAssert(expFood.status === 201, 'Expense 1 (Food) logged with 201 Created');
    const expFoodId = expFood.body.data.id;
    countAssert(expFood.body.data.amount === 4500, 'Expense amount is 4500');
    countAssert(expFood.body.data.currency === 'INR', 'Expense currency is INR');
    countAssert(expFood.body.data.amount_base === 4500, 'INR expense amount_base equals 4500.00');
    countAssert(expFood.body.data.rate_used === 1.0, 'INR expense rate_used is 1.000000');
    countAssert(expFood.body.data.paid_by_name === 'Alice Payer', 'Expense includes payer name');

    // Expense 2: USD Stay/Activity expense
    const expActivity = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Activity',
      amount: 50,
      currency: 'USD',
      date: '2026-11-03',
      note: 'Scuba Diving at Grande Island',
    });
    countAssert(expActivity.status === 201, 'Expense 2 (USD Activity) logged with 201 Created');
    const expActivityId = expActivity.body.data.id;
    countAssert(expActivity.body.data.currency === 'USD', 'Currency stored as USD');
    countAssert(expActivity.body.data.rate_used > 0, 'Server applied recorded rate_used > 0');
    countAssert(expActivity.body.data.amount_base > 50, 'USD amount_base correctly converted to INR base');

    // Expense 3: Charlie pays for Transport in INR
    const expTransport = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersC }, {
      category: 'Transport',
      amount: 2200,
      currency: 'INR',
      date: '2026-11-01',
      note: 'Airport Taxi to Hotel',
      paid_by: userCId,
    });
    countAssert(expTransport.status === 201, 'Expense 3 (Transport by Member C) logged with 201 Created');
    countAssert(expTransport.body.data.paid_by_name === 'Charlie Companion', 'Payer recorded as Charlie Companion');

    // Expense 4: Shopping expense
    const expShopping = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Shopping',
      amount: 3200,
      currency: 'INR',
      date: '2026-11-04',
      note: 'Souvenirs and cashew nuts',
    });
    countAssert(expShopping.status === 201, 'Expense 4 (Shopping) logged with 201 Created');

    // Invalid category test
    const invalidCat = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Gambling',
      amount: 500,
      currency: 'INR',
    });
    countAssert(invalidCat.status === 400, 'Invalid category rejected with 400 Bad Request');

    // Invalid amount test
    const invalidAmt = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Food',
      amount: -100,
      currency: 'INR',
    });
    countAssert(invalidAmt.status === 400, 'Negative amount rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Test Block 6: Listing, Filters & Updates
    // -------------------------------------------------------------
    console.log('\nTesting Expense Queries & Updates...');
    // List all expenses
    const allExpenses = await makeRequest(`/api/trips/${tripId}/expenses`, authHeadersA);
    countAssert(allExpenses.status === 200, 'GET /api/trips/:id/expenses returns 200 OK');
    countAssert(allExpenses.body.data.length === 4, 'List returns exactly 4 expenses');

    // Filter by category: Food
    const foodOnly = await makeRequest(`/api/trips/${tripId}/expenses?category=Food`, authHeadersA);
    countAssert(foodOnly.status === 200, 'Category filter returns 200 OK');
    countAssert(foodOnly.body.data.length === 1, 'Only 1 Food expense returned');
    countAssert(foodOnly.body.data[0].category === 'Food', 'Returned item is Food');

    // Filter by search note
    const searchNote = await makeRequest(`/api/trips/${tripId}/expenses?search=scuba`, authHeadersA);
    countAssert(searchNote.status === 200, 'Search filter returns 200 OK');
    countAssert(searchNote.body.data.length === 1, 'Search finds Scuba expense');

    // Update expense amount & note
    const updateExpRes = await makeRequest(`/api/trips/${tripId}/expenses/${expFoodId}`, { method: 'PUT', ...authHeadersA }, {
      amount: 5200,
      note: 'Dinner at Fisherman Wharf (with seafood platter)',
    });
    countAssert(updateExpRes.status === 200, 'PUT /api/trips/:id/expenses/:id returns 200 OK');
    countAssert(updateExpRes.body.data.amount === 5200, 'Updated expense amount is 5200');
    countAssert(updateExpRes.body.data.amount_base === 5200, 'Updated expense amount_base recomputed to 5200');

    // -------------------------------------------------------------
    // Test Block 7: IDOR Security Guards (ADR-010)
    // -------------------------------------------------------------
    console.log('\nTesting IDOR Security Guards...');
    // User B (outsider) attempting to view Trip A
    const idorTripView = await makeRequest(`/api/trips/${tripId}`, authHeadersB);
    countAssert(idorTripView.status === 404, 'User B view of User A trip returns 404 Not Found (IDOR protected)');

    // User B attempting to view User A's expenses
    const idorExpensesView = await makeRequest(`/api/trips/${tripId}/expenses`, authHeadersB);
    countAssert(idorExpensesView.status === 404, 'User B view of User A expenses returns 404 Not Found (IDOR protected)');

    // User B attempting to create an expense on Trip A
    const idorCreateExp = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersB }, {
      category: 'Food',
      amount: 1000,
      currency: 'INR',
    });
    countAssert(idorCreateExp.status === 404, 'User B logging expense on Trip A returns 404 Not Found (IDOR protected)');

    // User B attempting to delete User A's expense
    const idorDeleteExp = await makeRequest(`/api/trips/${tripId}/expenses/${expFoodId}`, { method: 'DELETE', ...authHeadersB });
    if (idorDeleteExp.status !== 404 && idorDeleteExp.status !== 403) {
      console.log('DEBUG idorDeleteExp:', idorDeleteExp.status, idorDeleteExp.body);
    }
    countAssert(idorDeleteExp.status === 404 || idorDeleteExp.status === 403, 'User B deleting User A expense rejected (IDOR protected)');

    // -------------------------------------------------------------
    // Test Block 8: Analytics & Recharts Data Aggregation
    // -------------------------------------------------------------
    console.log('\nTesting Spending Analytics Aggregations...');
    const analyticsRes = await makeRequest(`/api/trips/${tripId}/expenses/analytics`, authHeadersA);
    countAssert(analyticsRes.status === 200, 'GET /api/trips/:id/expenses/analytics returns 200 OK');

    const analytics = analyticsRes.body.data;
    countAssert(analytics.budget === 60000, 'Analytics budget matches 60000');
    countAssert(analytics.total_expenses_base > 0, 'Total expenses base is positive number');
    countAssert(analytics.total_spent_base === parseFloat((analytics.total_expenses_base + analytics.total_bookings_base).toFixed(2)), 'Total spent equals expenses + bookings');
    countAssert(analytics.remaining_budget === parseFloat((analytics.budget - analytics.total_spent_base).toFixed(2)), 'Remaining budget matches budget - total_spent');
    countAssert(typeof analytics.budget_utilization_pct === 'number', 'Budget utilization is numeric percentage');
    countAssert(analytics.categories?.length >= 3, 'Categories breakdown includes multiple categories');

    const foodCat = analytics.categories.find((c) => c.category === 'Food');
    countAssert(foodCat?.amount_base === 5200, 'Food category total reflects updated amount 5200');

    countAssert(analytics.daily_trend?.length >= 1, 'Daily spending trend contains date entries');
    countAssert(analytics.payer_breakdown?.length === 2, 'Payer breakdown contains both Alice and Charlie');

    // -------------------------------------------------------------
    // Test Block 9: Delete Expense & Trip Deletion Cascade
    // -------------------------------------------------------------
    console.log('\nTesting Expense Deletion and Trip Deletion...');
    const deleteExpRes = await makeRequest(`/api/trips/${tripId}/expenses/${expShopping.body.data.id}`, { method: 'DELETE', ...authHeadersA });
    countAssert(deleteExpRes.status === 200, 'DELETE /api/trips/:id/expenses/:id returns 200 OK');

    const afterDeleteExpenses = await makeRequest(`/api/trips/${tripId}/expenses`, authHeadersA);
    countAssert(afterDeleteExpenses.body.data.length === 3, 'Expense list count decreased to 3 after deletion');

    // Delete trip by outsider rejected
    const idorDeleteTrip = await makeRequest(`/api/trips/${tripId}`, { method: 'DELETE', ...authHeadersB });
    countAssert(idorDeleteTrip.status === 404 || idorDeleteTrip.status === 403, 'Trip deletion by outsider rejected with 403/404');

    // Delete trip by owner
    const deleteTripRes = await makeRequest(`/api/trips/${tripId}`, { method: 'DELETE', ...authHeadersA });
    countAssert(deleteTripRes.status === 200, 'DELETE /api/trips/:id returns 200 OK');

    // Verify trip no longer exists
    const checkDeleted = await makeRequest(`/api/trips/${tripId}`, authHeadersA);
    countAssert(checkDeleted.status === 404, 'Deleted trip returns 404 Not Found');

    console.log('\n============================================================');
    console.log(`Test Results: ${passedCount} Passed, 0 Failed`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ TEST RUNNER ABORTED WITH ERROR:\n', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().then(() => {
  // Gracefully close pool and exit
  db.pool.end();
});
