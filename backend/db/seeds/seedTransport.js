const db = require('../../config/db');
const { calculateDistance } = require('../../utils/geo');
const { PER_KM_RATES, FLIGHT_CLASSES, TRAIN_CLASSES, BUS_CLASSES } = require('../../config/constants');

/**
 * Deterministic pseudo-random number generator for reproducible fare generation.
 * Follows PRD Section 9 requirement.
 */
function createSeededRandom(seed = 987654321) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function seedTransport(options = {}) {
  const { days = 14, clean = false } = options;
  console.log(`[seedTransport] Seeding transport options (Flights, Trains, Buses) across ${days} days...`);

  if (clean) {
    console.log('[seedTransport] Cleaning existing transport_options and seats...');
    // Seats cascade on transport_options deletion
    await db.query('DELETE FROM seats');
    await db.query('DELETE FROM transport_options');
  }

  // Load all stations to lookup coordinates
  const stationsRes = await db.query('SELECT code, city, type, lat, lon FROM stations');
  const stationMap = new Map();
  for (const st of stationsRes.rows) {
    stationMap.set(st.code, {
      code: st.code,
      city: st.city,
      type: st.type,
      lat: parseFloat(st.lat),
      lon: parseFloat(st.lon),
    });
  }

  const rng = createSeededRandom(42);

  // 1. Flight Corridors
  const flightCorridors = [
    { origin: 'BOM', dest: 'DEL', operator: 'IndiGo', numberPrefix: '6E-20', timeHour: 7, timeMin: 15, durationMin: 135, class: 'Economy' },
    { origin: 'BOM', dest: 'DEL', operator: 'Air India', numberPrefix: 'AI-80', timeHour: 18, timeMin: 30, durationMin: 130, class: 'Business' },
    { origin: 'DEL', dest: 'BOM', operator: 'Vistara', numberPrefix: 'UK-94', timeHour: 8, timeMin: 45, durationMin: 140, class: 'Economy' },
    { origin: 'DEL', dest: 'BOM', operator: 'IndiGo', numberPrefix: '6E-51', timeHour: 19, timeMin: 15, durationMin: 135, class: 'Economy' },

    { origin: 'BOM', dest: 'GOI', operator: 'IndiGo', numberPrefix: '6E-45', timeHour: 9, timeMin: 30, durationMin: 75, class: 'Economy' },
    { origin: 'BOM', dest: 'GOI', operator: 'Akasa Air', numberPrefix: 'QP-13', timeHour: 16, timeMin: 0, durationMin: 70, class: 'Economy' },
    { origin: 'GOI', dest: 'BOM', operator: 'IndiGo', numberPrefix: '6E-46', timeHour: 11, timeMin: 45, durationMin: 75, class: 'Economy' },
    { origin: 'GOI', dest: 'BOM', operator: 'Air India', numberPrefix: 'AI-62', timeHour: 20, timeMin: 15, durationMin: 75, class: 'Business' },

    { origin: 'BOM', dest: 'BLR', operator: 'IndiGo', numberPrefix: '6E-34', timeHour: 6, timeMin: 45, durationMin: 105, class: 'Economy' },
    { origin: 'BOM', dest: 'BLR', operator: 'Akasa Air', numberPrefix: 'QP-11', timeHour: 15, timeMin: 30, durationMin: 100, class: 'Economy' },
    { origin: 'BLR', dest: 'BOM', operator: 'IndiGo', numberPrefix: '6E-35', timeHour: 10, timeMin: 0, durationMin: 105, class: 'Economy' },
    { origin: 'BLR', dest: 'BOM', operator: 'Vistara', numberPrefix: 'UK-87', timeHour: 21, timeMin: 0, durationMin: 100, class: 'Business' },

    { origin: 'DEL', dest: 'JAI', operator: 'IndiGo', numberPrefix: '6E-72', timeHour: 10, timeMin: 15, durationMin: 55, class: 'Economy' },
    { origin: 'JAI', dest: 'DEL', operator: 'Air India', numberPrefix: 'AI-49', timeHour: 17, timeMin: 45, durationMin: 55, class: 'Economy' },

    { origin: 'DEL', dest: 'BLR', operator: 'IndiGo', numberPrefix: '6E-21', timeHour: 8, timeMin: 0, durationMin: 170, class: 'Economy' },
    { origin: 'BLR', dest: 'DEL', operator: 'Air India', numberPrefix: 'AI-50', timeHour: 16, timeMin: 30, durationMin: 165, class: 'Economy' },

    { origin: 'DEL', dest: 'GOI', operator: 'IndiGo', numberPrefix: '6E-20', timeHour: 11, timeMin: 15, durationMin: 155, class: 'Economy' },
    { origin: 'GOI', dest: 'DEL', operator: 'SpiceJet', numberPrefix: 'SG-87', timeHour: 18, timeMin: 0, durationMin: 150, class: 'Economy' },

    { origin: 'BLR', dest: 'GOI', operator: 'IndiGo', numberPrefix: '6E-53', timeHour: 7, timeMin: 30, durationMin: 70, class: 'Economy' },
    { origin: 'GOI', dest: 'BLR', operator: 'Akasa Air', numberPrefix: 'QP-15', timeHour: 14, timeMin: 15, durationMin: 70, class: 'Economy' },

    { origin: 'BOM', dest: 'JAI', operator: 'IndiGo', numberPrefix: '6E-61', timeHour: 8, timeMin: 15, durationMin: 110, class: 'Economy' },
    { origin: 'JAI', dest: 'BOM', operator: 'SpiceJet', numberPrefix: 'SG-45', timeHour: 19, timeMin: 30, durationMin: 110, class: 'Economy' },
  ];

  // 2. Train Corridors
  const trainCorridors = [
    { origin: 'BCT', dest: 'NDLS', operator: 'Indian Railways', name: 'Mumbai Rajdhani (12951)', timeHour: 17, timeMin: 0, durationMin: 935, class: '3AC' },
    { origin: 'BCT', dest: 'NDLS', operator: 'Indian Railways', name: 'Mumbai Rajdhani (12951)', timeHour: 17, timeMin: 0, durationMin: 935, class: '1AC' },
    { origin: 'NDLS', dest: 'BCT', operator: 'Indian Railways', name: 'August Kranti Rajdhani (12954)', timeHour: 16, timeMin: 50, durationMin: 950, class: '2AC' },

    { origin: 'CSTM', dest: 'MAO', operator: 'Indian Railways', name: 'Vande Bharat Express (22229)', timeHour: 5, timeMin: 25, durationMin: 475, class: '3AC' },
    { origin: 'CSTM', dest: 'MAO', operator: 'Indian Railways', name: 'Mandovi Express (10103)', timeHour: 7, timeMin: 10, durationMin: 710, class: 'SL' },
    { origin: 'MAO', dest: 'CSTM', operator: 'Indian Railways', name: 'Vande Bharat Express (22230)', timeHour: 14, timeMin: 40, durationMin: 470, class: '1AC' },
    { origin: 'MAO', dest: 'CSTM', operator: 'Indian Railways', name: 'Konkan Kanya Express (20112)', timeHour: 19, timeMin: 0, durationMin: 720, class: '2AC' },

    { origin: 'CSTM', dest: 'SBC', operator: 'Indian Railways', name: 'Udyan Express (11301)', timeHour: 8, timeMin: 10, durationMin: 1370, class: '3AC' },
    { origin: 'SBC', dest: 'CSTM', operator: 'Indian Railways', name: 'Kanyakumari Express (16382)', timeHour: 22, timeMin: 0, durationMin: 1390, class: 'SL' },

    { origin: 'NDLS', dest: 'JP', operator: 'Indian Railways', name: 'Vande Bharat Express (20978)', timeHour: 6, timeMin: 10, durationMin: 235, class: '3AC' },
    { origin: 'NDLS', dest: 'JP', operator: 'Indian Railways', name: 'Ajmer Shatabdi (12015)', timeHour: 6, timeMin: 10, durationMin: 265, class: '1AC' },
    { origin: 'JP', dest: 'NDLS', operator: 'Indian Railways', name: 'Swarna Jayanti Rajdhani (12957)', timeHour: 18, timeMin: 30, durationMin: 280, class: '2AC' },

    { origin: 'CSTM', dest: 'PUNE', operator: 'Indian Railways', name: 'Deccan Queen SF (12123)', timeHour: 17, timeMin: 10, durationMin: 195, class: '2AC' },
    { origin: 'PUNE', dest: 'CSTM', operator: 'Indian Railways', name: 'Pragati Express (12126)', timeHour: 7, timeMin: 50, durationMin: 200, class: '3AC' },

    { origin: 'BCT', dest: 'ADI', operator: 'Indian Railways', name: 'Vande Bharat Express (20901)', timeHour: 6, timeMin: 0, durationMin: 315, class: '1AC' },
    { origin: 'ADI', dest: 'BCT', operator: 'Indian Railways', name: 'Vande Bharat Express (20902)', timeHour: 15, timeMin: 0, durationMin: 320, class: '3AC' },
  ];

  // 3. Bus Corridors
  const busCorridors = [
    { origin: 'BOM-BUS', dest: 'GOA-BUS', operator: 'Zingbus', number: 'ZB-MH-101', timeHour: 20, timeMin: 30, durationMin: 720, class: 'AC Sleeper' },
    { origin: 'BOM-BUS', dest: 'GOA-BUS', operator: 'Kadamba Volvo', number: 'GA-03-3451', timeHour: 21, timeMin: 15, durationMin: 700, class: 'AC Sleeper' },
    { origin: 'GOA-BUS', dest: 'BOM-BUS', operator: 'Neeta Travels', number: 'MH-12-8812', timeHour: 19, timeMin: 0, durationMin: 740, class: 'Standard' },
    { origin: 'GOA-BUS', dest: 'BOM-BUS', operator: 'Zingbus', number: 'ZB-GA-202', timeHour: 20, timeMin: 45, durationMin: 710, class: 'AC Sleeper' },

    { origin: 'BOM-BUS', dest: 'PUNE-BUS', operator: 'Shivneri MSRTC', number: 'MH-14-1122', timeHour: 7, timeMin: 0, durationMin: 210, class: 'Standard' },
    { origin: 'BOM-BUS', dest: 'PUNE-BUS', operator: 'Purple Travels', number: 'MH-12-7001', timeHour: 14, timeMin: 30, durationMin: 220, class: 'Standard' },
    { origin: 'PUNE-BUS', dest: 'BOM-BUS', operator: 'Shivneri MSRTC', number: 'MH-14-2233', timeHour: 18, timeMin: 0, durationMin: 215, class: 'Standard' },

    { origin: 'DEL-BUS', dest: 'JAI-BUS', operator: 'IntrCity SmartBus', number: 'IC-DL-402', timeHour: 8, timeMin: 0, durationMin: 330, class: 'AC Sleeper' },
    { origin: 'DEL-BUS', dest: 'JAI-BUS', operator: 'Zingbus', number: 'ZB-RJ-303', timeHour: 22, timeMin: 30, durationMin: 340, class: 'AC Sleeper' },
    { origin: 'JAI-BUS', dest: 'DEL-BUS', operator: 'RSRTC Volvo', number: 'RJ-14-5501', timeHour: 15, timeMin: 0, durationMin: 325, class: 'Standard' },

    { origin: 'BLR-BUS', dest: 'GOA-BUS', operator: 'SRS Travels', number: 'KA-01-7721', timeHour: 21, timeMin: 0, durationMin: 680, class: 'AC Sleeper' },
    { origin: 'GOA-BUS', dest: 'BLR-BUS', operator: 'VRL Travels', number: 'KA-25-9988', timeHour: 20, timeMin: 30, durationMin: 690, class: 'AC Sleeper' },

    { origin: 'BOM-BUS', dest: 'AMD-BUS', operator: 'Mahasagar Travels', number: 'GJ-01-4411', timeHour: 21, timeMin: 30, durationMin: 570, class: 'AC Sleeper' },
    { origin: 'AMD-BUS', dest: 'BOM-BUS', operator: 'Patel Tours', number: 'GJ-03-9912', timeHour: 22, timeMin: 0, durationMin: 580, class: 'Standard' },
  ];

  // Fetch existing transport options to avoid re-inserting duplicates
  const existingRes = await db.query(
    'SELECT mode, operator, number, origin_code, destination_code, departs_at, class FROM transport_options'
  );
  const existingSet = new Set();
  for (const row of existingRes.rows) {
    const key = `${row.mode}|${row.operator}|${row.number}|${row.origin_code}|${row.destination_code}|${new Date(row.departs_at).toISOString()}|${row.class}`;
    existingSet.add(key);
  }

  const itemsToInsert = [];
  const now = new Date();
  const startDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));

  let flightCount = 0;
  let trainCount = 0;
  let busCount = 0;

  for (let d = 0; d < days; d++) {
    const curDate = new Date(startDay.getTime() + d * 86400000);

    // 1. Process Flights
    for (const f of flightCorridors) {
      const orig = stationMap.get(f.origin);
      const dest = stationMap.get(f.dest);
      if (!orig || !dest) continue;

      const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);
      const departsAt = new Date(curDate.getTime());
      departsAt.setUTCHours(f.timeHour, f.timeMin, 0, 0);
      const arrivesAt = new Date(departsAt.getTime() + f.durationMin * 60000);

      const flightNumber = `${f.numberPrefix}${String(10 + d).padStart(2, '0')}`;
      const classMultiplier = FLIGHT_CLASSES[f.class]?.fareMultiplier || 1.0;
      const demandMultiplier = 1.0 + Math.max(0, (7 - d) * 0.035);
      const noise = 0.94 + rng() * 0.12;

      let price = Math.round(dist * PER_KM_RATES.flight * classMultiplier * demandMultiplier * noise);
      price = Math.max(price, 2800);

      const key = `flight|${f.operator}|${flightNumber}|${f.origin}|${f.dest}|${departsAt.toISOString()}|${f.class}`;
      if (!existingSet.has(key)) {
        itemsToInsert.push({
          mode: 'flight',
          operator: f.operator,
          number: flightNumber,
          origin_code: f.origin,
          destination_code: f.dest,
          departs_at: departsAt.toISOString(),
          arrives_at: arrivesAt.toISOString(),
          class: f.class,
          price,
        });
        existingSet.add(key);
        flightCount++;
      }
    }

    // 2. Process Trains
    for (const t of trainCorridors) {
      const orig = stationMap.get(t.origin);
      const dest = stationMap.get(t.dest);
      if (!orig || !dest) continue;

      const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);
      const departsAt = new Date(curDate.getTime());
      departsAt.setUTCHours(t.timeHour, t.timeMin, 0, 0);
      const arrivesAt = new Date(departsAt.getTime() + t.durationMin * 60000);

      const classMultiplier = TRAIN_CLASSES[t.class]?.fareMultiplier || 1.0;
      const demandMultiplier = 1.0 + Math.max(0, (5 - d) * 0.02);
      const noise = 0.96 + rng() * 0.08;

      let price = Math.round(dist * PER_KM_RATES.train * classMultiplier * demandMultiplier * noise);
      price = Math.max(price, 280);

      const key = `train|${t.operator}|${t.name}|${t.origin}|${t.dest}|${departsAt.toISOString()}|${t.class}`;
      if (!existingSet.has(key)) {
        itemsToInsert.push({
          mode: 'train',
          operator: t.operator,
          number: t.name,
          origin_code: t.origin,
          destination_code: t.dest,
          departs_at: departsAt.toISOString(),
          arrives_at: arrivesAt.toISOString(),
          class: t.class,
          price,
        });
        existingSet.add(key);
        trainCount++;
      }
    }

    // 3. Process Buses
    for (const b of busCorridors) {
      const orig = stationMap.get(b.origin);
      const dest = stationMap.get(b.dest);
      if (!orig || !dest) continue;

      const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);
      const departsAt = new Date(curDate.getTime());
      departsAt.setUTCHours(b.timeHour, b.timeMin, 0, 0);
      const arrivesAt = new Date(departsAt.getTime() + b.durationMin * 60000);

      const classMultiplier = BUS_CLASSES[b.class]?.fareMultiplier || 1.0;
      const demandMultiplier = 1.0 + Math.max(0, (5 - d) * 0.02);
      const noise = 0.95 + rng() * 0.10;

      let price = Math.round(dist * PER_KM_RATES.bus * classMultiplier * demandMultiplier * noise);
      price = Math.max(price, 350);

      const key = `bus|${b.operator}|${b.number}|${b.origin}|${b.dest}|${departsAt.toISOString()}|${b.class}`;
      if (!existingSet.has(key)) {
        itemsToInsert.push({
          mode: 'bus',
          operator: b.operator,
          number: b.number,
          origin_code: b.origin,
          destination_code: b.dest,
          departs_at: departsAt.toISOString(),
          arrives_at: arrivesAt.toISOString(),
          class: b.class,
          price,
        });
        existingSet.add(key);
        busCount++;
      }
    }
  }

  // Batch insert items in chunks of 50
  const BATCH_SIZE = 50;
  let insertedTotal = 0;

  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const chunk = itemsToInsert.slice(i, i + BATCH_SIZE);
    const placeholders = [];
    const values = [];
    let pIdx = 1;

    for (const item of chunk) {
      placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      values.push(
        item.mode,
        item.operator,
        item.number,
        item.origin_code,
        item.destination_code,
        item.departs_at,
        item.arrives_at,
        item.class,
        item.price
      );
    }

    const query = `
      INSERT INTO transport_options (mode, operator, number, origin_code, destination_code, departs_at, arrives_at, class, price)
      VALUES ${placeholders.join(', ')};
    `;
    await db.query(query, values);
    insertedTotal += chunk.length;
  }

  const totalCountRes = await db.query('SELECT count(*) FROM transport_options');
  console.log(`[seedTransport] Seeding completed. Inserted ${insertedTotal} new options (${flightCount} flights, ${trainCount} trains, ${busCount} buses). Total in DB: ${totalCountRes.rows[0].count}`);

  return {
    insertedTotal,
    flightsCreated: flightCount,
    trainsCreated: trainCount,
    busesCreated: busCount,
    totalInDb: parseInt(totalCountRes.rows[0].count, 10),
  };
}

if (require.main === module) {
  const clean = process.argv.includes('--clean');
  seedTransport({ clean })
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('[seedTransport] Error:', err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = seedTransport;
