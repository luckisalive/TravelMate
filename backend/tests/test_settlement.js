process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const app = require('../server');
const db = require('../config/db');
const { simplifyDebts } = require('../controllers/settlementController');

const TEST_PORT = 5004;
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
  console.log('🧪 Running Phase 7 Expense Splitting & Settlement Tests');
  console.log('============================================================\n');

  let passedCount = 0;
  const countAssert = (cond, msg) => {
    assert(cond, msg);
    passedCount++;
  };

  try {
    // -------------------------------------------------------------
    // Test Block 1: Pure Algorithm Tests (ADR-008 Min-Cash-Flow)
    // -------------------------------------------------------------
    console.log('Testing Greedy Debt Simplification Algorithm (ADR-008)...');

    // Case 1: Simple 2-person settlement
    const simpleCase = [
      { user_id: 1, name: 'Alice', email: 'alice@test.com', net_balance: 500 },
      { user_id: 2, name: 'Bob', email: 'bob@test.com', net_balance: -500 },
    ];
    const simpleTransfers = simplifyDebts(simpleCase);
    countAssert(simpleTransfers.length === 1, 'Simple 2-person requires exactly 1 transfer');
    countAssert(simpleTransfers[0].from_user === 2, 'Transfer from Bob (debtor)');
    countAssert(simpleTransfers[0].to_user === 1, 'Transfer to Alice (creditor)');
    countAssert(simpleTransfers[0].amount === 500, 'Transfer amount is 500');

    // Case 2: 3-person transitive settlement (Bob owes Charlie who owes Alice)
    const threePersonCase = [
      { user_id: 1, name: 'Alice', email: 'a@test.com', net_balance: 2000 },
      { user_id: 2, name: 'Bob', email: 'b@test.com', net_balance: -700 },
      { user_id: 3, name: 'Charlie', email: 'c@test.com', net_balance: -1300 },
    ];
    const threeTransfers = simplifyDebts(threePersonCase);
    countAssert(threeTransfers.length === 2, '3-person case resolves in exactly 2 transfers');
    countAssert(threeTransfers[0].from_user === 3 && threeTransfers[0].amount === 1300, 'Charlie pays Alice 1300');
    countAssert(threeTransfers[1].from_user === 2 && threeTransfers[1].amount === 700, 'Bob pays Alice 700');

    // Case 3: Penny rounding accuracy
    const pennyCase = [
      { user_id: 1, name: 'Alice', email: 'a@test.com', net_balance: 33.34 },
      { user_id: 2, name: 'Bob', email: 'b@test.com', net_balance: -16.67 },
      { user_id: 3, name: 'Charlie', email: 'c@test.com', net_balance: -16.67 },
    ];
    const pennyTransfers = simplifyDebts(pennyCase);
    countAssert(pennyTransfers.length === 2, 'Penny case resolves in 2 transfers');
    const totalPennySent = pennyTransfers.reduce((sum, t) => sum + t.amount, 0);
    countAssert(Math.abs(totalPennySent - 33.34) < 0.001, 'Total penny transfers sum precisely to 33.34');

    // Case 4: All zero balances
    const zeroCase = [
      { user_id: 1, name: 'Alice', email: 'a@test.com', net_balance: 0 },
      { user_id: 2, name: 'Bob', email: 'b@test.com', net_balance: 0 },
    ];
    countAssert(simplifyDebts(zeroCase).length === 0, 'Zero balances produce 0 transfers');

    // -------------------------------------------------------------
    // Start HTTP server on isolated test port
    // -------------------------------------------------------------
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        resolve();
      });
    });

    // -------------------------------------------------------------
    // Test Block 2: Setup Test Users & Trip
    // -------------------------------------------------------------
    console.log('\nSetting up test users & group trip...');
    const timestamp = Date.now();
    const emailA = `split_a_${timestamp}@example.com`;
    const emailB = `split_b_${timestamp}@example.com`;
    const emailC = `split_c_${timestamp}@example.com`;
    const emailOutsider = `split_out_${timestamp}@example.com`;

    const regA = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Alice GroupOwner',
      email: emailA,
      password: 'Password123!',
      currency_pref: 'INR',
    });
    countAssert(regA.status === 201, 'User A registered with 201 Created');
    const tokenA = regA.body.token;
    const userAId = regA.body.user.id;
    const authHeadersA = { headers: { Authorization: `Bearer ${tokenA}` } };

    const regB = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Bob Member',
      email: emailB,
      password: 'Password123!',
    });
    countAssert(regB.status === 201, 'User B registered with 201 Created');
    const tokenB = regB.body.token;
    const userBId = regB.body.user.id;
    const authHeadersB = { headers: { Authorization: `Bearer ${tokenB}` } };

    const regC = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Charlie Member',
      email: emailC,
      password: 'Password123!',
    });
    countAssert(regC.status === 201, 'User C registered with 201 Created');
    const tokenC = regC.body.token;
    const userCId = regC.body.user.id;
    const authHeadersC = { headers: { Authorization: `Bearer ${tokenC}` } };

    const regOut = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Dave Outsider',
      email: emailOutsider,
      password: 'Password123!',
    });
    const tokenOut = regOut.body.token;
    const authHeadersOut = { headers: { Authorization: `Bearer ${tokenOut}` } };

    // Create Group Trip
    const tripRes = await makeRequest('/api/trips', { method: 'POST', ...authHeadersA }, {
      name: 'Kerala Backwaters Group Tour',
      start_date: '2026-12-01',
      end_date: '2026-12-08',
      budget: 80000,
      base_currency: 'INR',
    });
    countAssert(tripRes.status === 201, 'Group trip created with 201 Created');
    const tripId = tripRes.body.data.id;

    // Add Bob and Charlie to trip
    const addB = await makeRequest(`/api/trips/${tripId}/members`, { method: 'POST', ...authHeadersA }, {
      email: emailB,
      role: 'member',
    });
    countAssert(addB.status === 201, 'Bob added to trip');

    const addC = await makeRequest(`/api/trips/${tripId}/members`, { method: 'POST', ...authHeadersA }, {
      email: emailC,
      role: 'member',
    });
    countAssert(addC.status === 201, 'Charlie added to trip');

    // -------------------------------------------------------------
    // Test Block 3: Group Expense Creation with Equal & Custom Splits
    // -------------------------------------------------------------
    console.log('\nTesting Group Expense Creation & Splits...');

    // Expense 1: Alice pays 3000 INR for dinner, split equally among all 3 members (Alice, Bob, Charlie)
    const exp1Res = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Food',
      amount: 3000,
      currency: 'INR',
      date: '2026-12-02',
      note: 'Seafood dinner at Alleppey',
      split_type: 'equal',
    });
    countAssert(exp1Res.status === 201, 'Equal split expense created with 201 Created');
    countAssert(exp1Res.body.data.split_type === 'equal', 'Expense split_type is equal');
    countAssert(exp1Res.body.data.splits.length === 3, 'Expense has 3 split records');
    const exp1SplitsSum = exp1Res.body.data.splits.reduce((sum, s) => sum + s.amount_owed, 0);
    countAssert(Math.abs(exp1SplitsSum - 3000) < 0.01, 'Sum of split amounts equals total 3000');
    countAssert(exp1Res.body.data.splits.every((s) => s.amount_owed === 1000), 'Each member owes exactly 1000');

    // Expense 2: Bob pays 100 USD (≈ INR base), split custom: Alice 40%, Bob 30%, Charlie 30%
    // Let's do 100 USD with splits: Alice 40 USD, Bob 30 USD, Charlie 30 USD
    const exp2Res = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersB }, {
      category: 'Activity',
      amount: 100,
      currency: 'USD',
      date: '2026-12-03',
      note: 'Houseboat rental deposit',
      paid_by: userBId,
      split_type: 'custom',
      splits: [
        { user_id: userAId, amount_owed: 40 },
        { user_id: userBId, amount_owed: 30 },
        { user_id: userCId, amount_owed: 30 },
      ],
    });
    countAssert(exp2Res.status === 201, 'Custom USD split expense created with 201 Created');
    countAssert(exp2Res.body.data.split_type === 'custom', 'Expense split_type is custom');
    countAssert(exp2Res.body.data.splits.length === 3, 'Custom splits count is 3');
    const exp2BaseSum = exp2Res.body.data.splits.reduce((sum, s) => sum + s.amount_owed_base, 0);
    countAssert(Math.abs(exp2BaseSum - exp2Res.body.data.amount_base) < 0.05, 'Splits amount_owed_base sums to expense amount_base');

    // Expense 3: Custom split sum mismatch validation
    const badSumRes = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Food',
      amount: 1000,
      currency: 'INR',
      split_type: 'custom',
      splits: [
        { user_id: userAId, amount_owed: 300 },
        { user_id: userBId, amount_owed: 300 }, // sum is 600, not 1000!
      ],
    });
    countAssert(badSumRes.status === 400, 'Custom split with invalid sum rejected with 400 Bad Request');

    // Expense 4: Custom split with non-member validation
    const nonMemberSplitRes = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersA }, {
      category: 'Stay',
      amount: 2000,
      currency: 'INR',
      split_type: 'custom',
      splits: [
        { user_id: userAId, amount_owed: 1000 },
        { user_id: 99999, amount_owed: 1000 },
      ],
    });
    countAssert(nonMemberSplitRes.status === 400, 'Custom split with non-member rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Test Block 4: Balances & Debt Simplification Calculation
    // -------------------------------------------------------------
    console.log('\nTesting Balance Calculations & Greedy Debt Simplification API...');

    // Let's add a clear predictable 3rd expense in INR for clean math:
    // Charlie pays 1200 INR, split equally between Bob and Charlie (600 each, Alice not included)
    const exp3Res = await makeRequest(`/api/trips/${tripId}/expenses`, { method: 'POST', ...authHeadersC }, {
      category: 'Transport',
      amount: 1200,
      currency: 'INR',
      date: '2026-12-04',
      note: 'Auto tuk-tuk tour',
      paid_by: userCId,
      split_type: 'equal',
      split_members: [userBId, userCId],
    });
    countAssert(exp3Res.status === 201, 'Subset equal split expense created with 201 Created');
    countAssert(exp3Res.body.data.splits.length === 2, 'Subset split includes exactly 2 members');

    // Fetch balances
    const balancesRes = await makeRequest(`/api/trips/${tripId}/balances`, authHeadersA);
    countAssert(balancesRes.status === 200, 'GET /api/trips/:id/balances returns 200 OK');
    countAssert(balancesRes.body.success === true, 'Balances response success: true');
    countAssert(balancesRes.body.data.members.length === 3, 'Balances contains all 3 trip members');

    // Check conservation of balance: sum of net balances MUST equal 0.00
    const netSum = balancesRes.body.data.members.reduce((sum, m) => sum + m.net_balance, 0);
    countAssert(Math.abs(netSum) < 0.05, 'Sum of all members net balances equals 0.00');

    // Check suggested settlements exists
    const suggested = balancesRes.body.data.suggested_settlements;
    countAssert(Array.isArray(suggested) && suggested.length > 0, 'Suggested settlements list is non-empty');
    countAssert(suggested[0].amount > 0, 'Suggested settlement amount is positive');
    countAssert(suggested[0].from_user !== suggested[0].to_user, 'Settlement from_user and to_user are distinct');
    countAssert(balancesRes.body.data.is_settled_up === false, 'Trip is not settled up initially');

    // -------------------------------------------------------------
    // Test Block 5: Recording Settlements (POST /api/settlements)
    // -------------------------------------------------------------
    console.log('\nTesting Settlement Logging & Settle-Up Lifecycle...');

    // Test unauthenticated settlement rejection
    const unauthSett = await makeRequest('/api/settlements', { method: 'POST' }, {
      trip_id: tripId,
      from_user: userBId,
      to_user: userAId,
      amount: 100,
    });
    countAssert(unauthSett.status === 401, 'Unauthenticated settlement rejected with 401 Unauthorized');

    // Test settlement with invalid same-user
    const sameUserSett = await makeRequest('/api/settlements', { method: 'POST', ...authHeadersA }, {
      trip_id: tripId,
      from_user: userAId,
      to_user: userAId,
      amount: 100,
    });
    countAssert(sameUserSett.status === 400, 'Settlement to self rejected with 400 Bad Request');

    // Test settlement with negative amount
    const negAmountSett = await makeRequest('/api/settlements', { method: 'POST', ...authHeadersA }, {
      trip_id: tripId,
      from_user: userBId,
      to_user: userAId,
      amount: -50,
    });
    countAssert(negAmountSett.status === 400, 'Negative settlement rejected with 400 Bad Request');

    // Record the first suggested settlement via POST /api/settlements
    const firstSuggested = suggested[0];
    const recordRes1 = await makeRequest('/api/settlements', { method: 'POST', ...authHeadersA }, {
      trip_id: tripId,
      from_user: firstSuggested.from_user,
      to_user: firstSuggested.to_user,
      amount: firstSuggested.amount,
    });
    countAssert(recordRes1.status === 201, 'POST /api/settlements records payment with 201 Created');
    countAssert(recordRes1.body.data.amount === firstSuggested.amount, 'Recorded amount matches');
    countAssert(recordRes1.body.data.from_name !== '', 'Contains payer name');
    countAssert(recordRes1.body.data.to_name !== '', 'Contains recipient name');
    const recordedSettlementId = recordRes1.body.data.id;

    // Verify balances update after recording settlement
    const balancesAfterSett1 = await makeRequest(`/api/trips/${tripId}/balances`, authHeadersA);
    const updatedPayer = balancesAfterSett1.body.data.members.find((m) => m.user_id === firstSuggested.from_user);
    countAssert(updatedPayer.total_settled_sent === firstSuggested.amount, 'Payer total_settled_sent updated');

    // Record remaining suggested settlements to achieve 100% Settle-Up!
    const remainingSuggestions = balancesAfterSett1.body.data.suggested_settlements;
    for (const rem of remainingSuggestions) {
      const res = await makeRequest(`/api/trips/${tripId}/settlements`, { method: 'POST', ...authHeadersA }, {
        from_user: rem.from_user,
        to_user: rem.to_user,
        amount: rem.amount,
      });
      countAssert(res.status === 201, `Recorded settlement of ${rem.amount} to settle debt`);
    }

    // Check that trip is now fully settled!
    const fullySettledRes = await makeRequest(`/api/trips/${tripId}/balances`, authHeadersA);
    countAssert(fullySettledRes.body.data.is_settled_up === true, 'Trip is now 100% settled up (is_settled_up = true)');
    countAssert(fullySettledRes.body.data.suggested_settlements.length === 0, 'No more suggested settlements remaining');

    // -------------------------------------------------------------
    // Test Block 6: Settlement History & Deletion (Revert)
    // -------------------------------------------------------------
    console.log('\nTesting Settlement History & Reversion...');

    const historyRes = await makeRequest(`/api/trips/${tripId}/settlements`, authHeadersA);
    countAssert(historyRes.status === 200, 'GET /api/trips/:id/settlements returns 200 OK');
    countAssert(historyRes.body.data.length >= 1, 'Settlement history contains records');

    // Test deleting the first settlement (revert)
    const delRes = await makeRequest(`/api/settlements/${recordedSettlementId}`, { method: 'DELETE', ...authHeadersA });
    countAssert(delRes.status === 200, 'DELETE /api/settlements/:id returns 200 OK');

    // Balances should reflect reverted debt
    const balancesAfterRevert = await makeRequest(`/api/trips/${tripId}/balances`, authHeadersA);
    countAssert(balancesAfterRevert.body.data.is_settled_up === false, 'Trip returns to unsettled after settlement deletion');

    // -------------------------------------------------------------
    // Test Block 7: IDOR Protection (ADR-010)
    // -------------------------------------------------------------
    console.log('\nTesting IDOR Security Guards...');

    // Outsider trying to view trip balances
    const outsiderBal = await makeRequest(`/api/trips/${tripId}/balances`, authHeadersOut);
    countAssert(outsiderBal.status === 404, 'Outsider viewing balances blocked with 404 Not Found (IDOR protected)');

    // Outsider trying to record settlement
    const outsiderSett = await makeRequest('/api/settlements', { method: 'POST', ...authHeadersOut }, {
      trip_id: tripId,
      from_user: userAId,
      to_user: userBId,
      amount: 500,
    });
    countAssert(outsiderSett.status === 404, 'Outsider recording settlement blocked with 404 Not Found (IDOR protected)');

    console.log('\n============================================================');
    console.log(`Test Results: ${passedCount} Passed, 0 Failed`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed with Error:\n', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().then(() => {
  if (process.exitCode === 1) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
