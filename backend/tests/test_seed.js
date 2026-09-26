const assert = require('assert');
const db = require('../config/db');
const { DEMO_CITIES } = require('../config/constants');

async function runSeedTests() {
  console.log('============================================================');
  console.log('🧪 Running Phase 3 Data Seeding Verification Tests');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Stations Table Tests
  await test('Stations: Table contains at least 30 stations', async () => {
    const res = await db.query('SELECT count(*) FROM stations');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 30, `Expected >= 30 stations, found ${count}`);
  });

  await test('Stations: Contains airports, rail stations, and bus terminals', async () => {
    const res = await db.query('SELECT DISTINCT type FROM stations');
    const types = res.rows.map((r) => r.type);
    assert(types.includes('airport'), 'Missing airport stations');
    assert(types.includes('rail'), 'Missing rail stations');
    assert(types.includes('bus'), 'Missing bus terminals');
  });

  await test('Stations: All 5 primary demo cities are present', async () => {
    const res = await db.query('SELECT DISTINCT city FROM stations');
    const cities = res.rows.map((r) => r.city);
    for (const city of DEMO_CITIES) {
      assert(cities.includes(city), `Missing demo city in stations: ${city}`);
    }
  });

  await test('Stations: Coordinates are valid within Indian bounds (8°-36° N, 68°-98° E)', async () => {
    const res = await db.query('SELECT code, lat, lon FROM stations');
    for (const row of res.rows) {
      const lat = parseFloat(row.lat);
      const lon = parseFloat(row.lon);
      assert(!isNaN(lat) && lat >= 8 && lat <= 36, `Invalid latitude for station ${row.code}: ${lat}`);
      assert(!isNaN(lon) && lon >= 68 && lon <= 98, `Invalid longitude for station ${row.code}: ${lon}`);
    }
  });

  // 2. Hotels Table Tests
  await test('Hotels: Table contains at least 30 verified hotels', async () => {
    const res = await db.query('SELECT count(*) FROM hotels');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 30, `Expected >= 30 hotels, found ${count}`);
  });

  await test('Hotels: All 5 demo cities have at least 5 hotels each', async () => {
    const res = await db.query(`
      SELECT city, count(*) as count 
      FROM hotels 
      WHERE city = ANY($1) 
      GROUP BY city
    `, [DEMO_CITIES]);

    const countsByCity = {};
    for (const row of res.rows) {
      countsByCity[row.city] = parseInt(row.count, 10);
    }

    for (const city of DEMO_CITIES) {
      const count = countsByCity[city] || 0;
      assert(count >= 5, `Expected >= 5 hotels for ${city}, found ${count}`);
    }
  });

  await test('Hotels: Valid star ratings (1.0-5.0), reviews (1.0-5.0), and prices (> 500 INR)', async () => {
    const res = await db.query('SELECT name, stars, rating, price_per_night, image_url FROM hotels');
    for (const h of res.rows) {
      const stars = parseFloat(h.stars);
      const rating = parseFloat(h.rating);
      const price = parseFloat(h.price_per_night);

      assert(stars >= 1.0 && stars <= 5.0, `Hotel ${h.name} has invalid stars: ${stars}`);
      assert(rating >= 1.0 && rating <= 5.0, `Hotel ${h.name} has invalid rating: ${rating}`);
      assert(price >= 500, `Hotel ${h.name} has abnormally low price: ${price}`);
      assert(typeof h.image_url === 'string' && h.image_url.startsWith('http'), `Hotel ${h.name} missing valid image_url`);
    }
  });

  // 3. Transport Options Tests
  await test('Transport Options: Table contains multi-modal options (> 500 records)', async () => {
    const res = await db.query('SELECT count(*) FROM transport_options');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 500, `Expected >= 500 transport options, found ${count}`);
  });

  await test('Transport Options: Contains flight, train, and bus modes', async () => {
    const res = await db.query('SELECT DISTINCT mode FROM transport_options');
    const modes = res.rows.map((r) => r.mode);
    assert(modes.includes('flight'), 'Missing flight options');
    assert(modes.includes('train'), 'Missing train options');
    assert(modes.includes('bus'), 'Missing bus options');
  });

  await test('Transport Options: All records satisfy chk_travel_times (arrives_at > departs_at)', async () => {
    const res = await db.query(`
      SELECT count(*) 
      FROM transport_options 
      WHERE arrives_at <= departs_at
    `);
    const invalidCount = parseInt(res.rows[0].count, 10);
    assert.strictEqual(invalidCount, 0, `Found ${invalidCount} options with arrives_at <= departs_at`);
  });

  await test('Transport Options: Relational integrity (all station codes exist in stations)', async () => {
    const res = await db.query(`
      SELECT count(*) 
      FROM transport_options t
      LEFT JOIN stations o ON t.origin_code = o.code
      LEFT JOIN stations d ON t.destination_code = d.code
      WHERE o.code IS NULL OR d.code IS NULL
    `);
    const orphanCount = parseInt(res.rows[0].count, 10);
    assert.strictEqual(orphanCount, 0, `Found ${orphanCount} transport options with orphaned station codes`);
  });

  // 4. Seats Table Tests
  await test('Seats: Table contains > 50,000 flight seats', async () => {
    const res = await db.query('SELECT count(*) FROM seats');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 50000, `Expected >= 50000 seats, found ${count}`);
  });

  await test('Seats: Sample flights have exactly 180 seats (1A through 30F)', async () => {
    const flightRes = await db.query(`
      SELECT id, number FROM transport_options WHERE mode = 'flight' LIMIT 5
    `);

    for (const flight of flightRes.rows) {
      const seatRes = await db.query('SELECT seat_no FROM seats WHERE transport_id = $1', [flight.id]);
      assert.strictEqual(seatRes.rows.length, 180, `Flight ${flight.number} has ${seatRes.rows.length} seats instead of 180`);

      const seatSet = new Set(seatRes.rows.map((r) => r.seat_no));
      assert(seatSet.has('1A'), `Flight ${flight.number} missing seat 1A`);
      assert(seatSet.has('14C'), `Flight ${flight.number} missing seat 14C`);
      assert(seatSet.has('30F'), `Flight ${flight.number} missing seat 30F`);
    }
  });

  await test('Seats: Unique constraint enforced per flight (no duplicates)', async () => {
    const dupRes = await db.query(`
      SELECT transport_id, seat_no, count(*) 
      FROM seats 
      GROUP BY transport_id, seat_no 
      HAVING count(*) > 1
    `);
    assert.strictEqual(dupRes.rows.length, 0, `Found ${dupRes.rows.length} duplicate seats on flights`);
  });

  // 5. Exchange Rates Tests
  await test('Exchange Rates: Contains base currency INR and major currencies', async () => {
    const res = await db.query("SELECT currency, rate FROM exchange_rates WHERE base = 'INR'");
    assert(res.rows.length >= 10, `Expected >= 10 exchange rates, found ${res.rows.length}`);

    const currencyMap = new Map();
    for (const r of res.rows) {
      currencyMap.set(r.currency, parseFloat(r.rate));
    }

    assert(currencyMap.has('USD'), 'Missing USD rate');
    assert(currencyMap.has('EUR'), 'Missing EUR rate');
    assert(currencyMap.has('GBP'), 'Missing GBP rate');
    assert(currencyMap.has('AED'), 'Missing AED rate');
    assert(currencyMap.get('USD') > 0, 'USD rate must be positive');
  });

  console.log('\n============================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSeedTests()
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('Fatal test execution error:', err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = runSeedTests;
