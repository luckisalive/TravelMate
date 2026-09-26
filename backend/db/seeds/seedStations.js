const path = require('path');
const fs = require('fs');
const db = require('../../config/db');

async function seedStations() {
  console.log('[seedStations] Seeding stations (Airports, Railway, Bus terminals)...');
  const stationsPath = path.join(__dirname, '../fixtures/stations.json');
  const stations = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

  let countAirport = 0;
  let countRail = 0;
  let countBus = 0;

  for (const st of stations) {
    const query = `
      INSERT INTO stations (code, name, city, country, type, lat, lon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        type = EXCLUDED.type,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon;
    `;
    await db.query(query, [
      st.code,
      st.name,
      st.city,
      st.country || 'India',
      st.type,
      st.lat,
      st.lon,
    ]);

    if (st.type === 'airport') countAirport++;
    else if (st.type === 'rail') countRail++;
    else if (st.type === 'bus') countBus++;
  }

  const total = countAirport + countRail + countBus;
  console.log(`[seedStations] Successfully seeded ${total} stations (${countAirport} airports, ${countRail} railway stations, ${countBus} bus terminals).`);
  return { total, countAirport, countRail, countBus, stations };
}

if (require.main === module) {
  seedStations()
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('[seedStations] Error:', err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = seedStations;
