const db = require('../../config/db');
const seedExchangeRates = require('./seedExchangeRates');
const seedStations = require('./seedStations');
const seedHotels = require('./seedHotels');
const seedTransport = require('./seedTransport');
const seedSeats = require('./seedSeats');
const seedUsers = require('./seedUsers');

/**
 * Master Seed Orchestration Script for TravelMate
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --clean
 */
async function runMasterSeed() {
  const isClean = process.argv.includes('--clean');
  console.log('============================================================');
  console.log('🌍 TravelMate ETL Data Seeding Pipeline (Phase 3)');
  console.log(`Mode: ${isClean ? 'Clean Re-seed (--clean)' : 'Idempotent Sync'}`);
  console.log('============================================================\n');

  const startTimestamp = Date.now();

  try {
    // 1. Seed Exchange Rates
    console.log('[1/5] Currency & Exchange Rates:');
    const ratesResult = await seedExchangeRates();
    console.log('');

    // 2. Seed Stations (Airports, Railway, Bus Terminals)
    console.log('[2/5] Transit Hubs & Stations:');
    const stationsResult = await seedStations();
    console.log('');

    // 3. Seed Hotels
    console.log('[3/5] Hotels & Accommodations:');
    const hotelsResult = await seedHotels();
    console.log('');

    // 4. Seed Transport Options (Flights, Trains, Buses)
    console.log('[4/5] Multi-modal Transport Inventory:');
    const transportResult = await seedTransport({ days: 14, clean: isClean });
    console.log('');

    // 5. Seed Flight Seats
    console.log('[5/6] Flight Seats Grid (30 rows x 6 columns A-F):');
    const seatsResult = await seedSeats({ clean: isClean });
    console.log('');

    // 6. Seed Demo Users (Alice, Bob, Charlie)
    console.log('[6/6] Demo Personas & Authentication Accounts:');
    await seedUsers();
    console.log('');

    // Query final row counts for comprehensive audit
    console.log('============================================================');
    console.log('📊 DATABASE SEEDING AUDIT SUMMARY');
    console.log('============================================================');

    const [
      ratesCount,
      stationsCount,
      hotelsCount,
      transportCount,
      seatsCount,
      airportsCount,
      railCount,
      busCount,
      flightsCount,
      trainsCount,
      busesCount,
    ] = await Promise.all([
      db.query('SELECT count(*) FROM exchange_rates'),
      db.query('SELECT count(*) FROM stations'),
      db.query('SELECT count(*) FROM hotels'),
      db.query('SELECT count(*) FROM transport_options'),
      db.query('SELECT count(*) FROM seats'),
      db.query("SELECT count(*) FROM stations WHERE type = 'airport'"),
      db.query("SELECT count(*) FROM stations WHERE type = 'rail'"),
      db.query("SELECT count(*) FROM stations WHERE type = 'bus'"),
      db.query("SELECT count(*) FROM transport_options WHERE mode = 'flight'"),
      db.query("SELECT count(*) FROM transport_options WHERE mode = 'train'"),
      db.query("SELECT count(*) FROM transport_options WHERE mode = 'bus'"),
    ]);

    const auditTable = [
      { Entity: 'Exchange Rates', Count: ratesCount.rows[0].count, Details: `Base INR (${ratesResult.date})` },
      { Entity: 'Transit Stations', Count: stationsCount.rows[0].count, Details: `${airportsCount.rows[0].count} airports, ${railCount.rows[0].count} rail, ${busCount.rows[0].count} bus` },
      { Entity: 'Hotels', Count: hotelsCount.rows[0].count, Details: 'Mumbai, Delhi, BLR, Goa, Jaipur, Pune, AMD' },
      { Entity: 'Transport Options', Count: transportCount.rows[0].count, Details: `${flightsCount.rows[0].count} flights, ${trainsCount.rows[0].count} trains, ${busesCount.rows[0].count} buses` },
      { Entity: 'Flight Seats', Count: seatsCount.rows[0].count, Details: '180 seats per flight (1A - 30F)' },
    ];

    console.table(auditTable);

    const totalSeconds = ((Date.now() - startTimestamp) / 1000).toFixed(2);
    console.log(`\n✅ ETL Data Seeding Pipeline completed successfully in ${totalSeconds} seconds.`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ FATAL ERROR in Data Seeding Pipeline:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  runMasterSeed();
}

module.exports = runMasterSeed;
