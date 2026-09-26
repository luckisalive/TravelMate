const path = require('path');
const fs = require('fs');
const db = require('../../config/db');

/**
 * Optional Overpass fetcher with strict timeout fallback.
 * Strictly respects ADR-006: Offline bundled fixtures are the primary source of truth.
 */
async function fetchOverpassHotels(cityName, bbox) {
  const query = `
    [out:json][timeout:5];
    (
      node["tourism"="hotel"](${bbox});
      way["tourism"="hotel"](${bbox});
    );
    out center 10;
  `;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[seedHotels] Overpass query for ${cityName} timed out or failed (${err.message}). Using bundled fixtures.`);
    return null;
  }
}

async function seedHotels(options = {}) {
  console.log('[seedHotels] Seeding hotels from verified fixtures...');
  const fixturesPath = path.join(__dirname, '../fixtures/hotels.json');
  const hotels = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

  let inserted = 0;
  let updated = 0;

  for (const h of hotels) {
    // Check for existing hotel by name and city for clean idempotency
    const existing = await db.query(
      'SELECT id FROM hotels WHERE name = $1 AND city = $2',
      [h.name, h.city]
    );

    if (existing.rows.length > 0) {
      const hotelId = existing.rows[0].id;
      await db.query(
        `UPDATE hotels 
         SET stars = $1, price_per_night = $2, rating = $3, image_url = $4, lat = $5, lon = $6, osm_id = $7
         WHERE id = $8`,
        [h.stars, h.price_per_night, h.rating, h.image_url, h.lat, h.lon, h.osm_id, hotelId]
      );
      updated++;
    } else {
      await db.query(
        `INSERT INTO hotels (name, city, stars, price_per_night, rating, image_url, lat, lon, osm_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [h.name, h.city, h.stars, h.price_per_night, h.rating, h.image_url, h.lat, h.lon, h.osm_id]
      );
      inserted++;
    }
  }

  // City-wise counts
  const cityCounts = {};
  for (const h of hotels) {
    cityCounts[h.city] = (cityCounts[h.city] || 0) + 1;
  }

  console.log(`[seedHotels] Successfully seeded ${hotels.length} hotels (${inserted} inserted, ${updated} updated).`);
  console.log('[seedHotels] Distribution by city:', cityCounts);

  return { total: hotels.length, inserted, updated, cityCounts };
}

if (require.main === module) {
  seedHotels()
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('[seedHotels] Error:', err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = seedHotels;
