const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function applyIndexes() {
  console.log('--- Applying Performance Indexes to Neon PostgreSQL ---');
  const sqlPath = path.join(__dirname, 'indexes.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Performance indexes applied successfully!');

    // Verify index list
    const res = await pool.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname IN (
          'idx_bookings_trip_id',
          'idx_bookings_user_created',
          'idx_seats_booking_id',
          'idx_transport_dest',
          'idx_exchange_rates_currency',
          'idx_hotels_city_price'
        )
      ORDER BY tablename, indexname;
    `);

    console.log('Verified active performance indexes:');
    res.rows.forEach((r) => console.log(`  - ${r.tablename}: ${r.indexname}`));
  } catch (err) {
    console.error('❌ Failed to apply indexes:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyIndexes();
