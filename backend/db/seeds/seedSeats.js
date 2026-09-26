const db = require('../../config/db');

/**
 * Generates and seeds flight seats (A-F across 30 rows = 180 seats per flight)
 * utilizing high-throughput multi-row batched INSERTs for Neon PostgreSQL.
 */
async function seedSeats(options = {}) {
  const { clean = false, batchSize = 400 } = options;
  console.log('[seedSeats] Seeding flight seats (A-F across 30 rows = 180 seats per flight)...');

  if (clean) {
    console.log('[seedSeats] Cleaning existing seats...');
    await db.query('DELETE FROM seats');
  }

  // Find all flights that do NOT yet have seats seeded
  const flightsRes = await db.query(`
    SELECT t.id, t.number, t.operator 
    FROM transport_options t
    LEFT JOIN (SELECT DISTINCT transport_id FROM seats) s ON t.id = s.transport_id
    WHERE t.mode = 'flight' AND s.transport_id IS NULL
    ORDER BY t.id
  `);

  const pendingFlights = flightsRes.rows;
  if (pendingFlights.length === 0) {
    const totalCountRes = await db.query('SELECT count(*) FROM seats');
    console.log(`[seedSeats] All flights already have seats seeded. Current total seats: ${totalCountRes.rows[0].count}`);
    return { totalSeats: parseInt(totalCountRes.rows[0].count, 10), insertedSeats: 0 };
  }

  console.log(`[seedSeats] Generating 180 seats for each of ${pendingFlights.length} flights (${pendingFlights.length * 180} total seats)...`);

  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
  let seatBuffer = [];
  let totalInserted = 0;

  async function flushBuffer() {
    if (seatBuffer.length === 0) return;

    const values = [];
    const placeholders = [];
    let pIdx = 1;

    for (const seat of seatBuffer) {
      placeholders.push(`($${pIdx++}, $${pIdx++}, NULL)`);
      values.push(seat.transport_id, seat.seat_no);
    }

    const query = `
      INSERT INTO seats (transport_id, seat_no, booking_id)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (transport_id, seat_no) DO NOTHING;
    `;

    await db.query(query, values);
    totalInserted += seatBuffer.length;
    seatBuffer = [];
  }

  const startTime = Date.now();

  for (let fIdx = 0; fIdx < pendingFlights.length; fIdx++) {
    const flight = pendingFlights[fIdx];

    for (let row = 1; row <= 30; row++) {
      for (const col of columns) {
        seatBuffer.push({
          transport_id: flight.id,
          seat_no: `${row}${col}`,
        });

        if (seatBuffer.length >= batchSize) {
          await flushBuffer();
        }
      }
    }

    if ((fIdx + 1) % 50 === 0 || fIdx === pendingFlights.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[seedSeats] Processed ${fIdx + 1}/${pendingFlights.length} flights (${totalInserted} seats in ${elapsed}s)...`);
    }
  }

  // Flush any remaining items in buffer
  await flushBuffer();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalCountRes = await db.query('SELECT count(*) FROM seats');
  console.log(`[seedSeats] Completed in ${totalTime}s. Total seats in database: ${totalCountRes.rows[0].count}`);

  return {
    totalSeats: parseInt(totalCountRes.rows[0].count, 10),
    insertedSeats: totalInserted,
    flightsProcessed: pendingFlights.length,
  };
}

if (require.main === module) {
  const clean = process.argv.includes('--clean');
  seedSeats({ clean })
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('[seedSeats] Error:', err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = seedSeats;
