const db = require('../config/db');
const { 
  TRAVEL_STYLES, 
  FLIGHT_CLASSES, 
  TRAIN_CLASSES, 
  BUS_CLASSES 
} = require('../config/constants');

// Helper to calculate formatted duration string (e.g., "2h 15m")
function formatDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

// Helper to generate outbound search URLs (PRD Section 9 / ADR-007)
function getOutboundUrls(transport, origin, dest) {
  const origCity = origin?.city || transport.origin_code;
  const destCity = dest?.city || transport.destination_code;
  const origCode = origin?.code || transport.origin_code;
  const destCode = dest?.code || transport.destination_code;
  const dateStr = new Date(transport.departs_at).toISOString().split('T')[0];

  if (transport.mode === 'flight') {
    return {
      googleFlights: `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(destCity)}%20from%20${encodeURIComponent(origCity)}%20on%20${dateStr}`,
      makeMyTrip: `https://www.makemytrip.com/flight/search?itinerary=${origCode}-${destCode}-${dateStr}&tripType=O`,
      skyscanner: `https://www.skyscanner.co.in/transport/flights/${origCode.toLowerCase()}/${destCode.toLowerCase()}/`,
    };
  } else if (transport.mode === 'train') {
    return {
      irctc: `https://www.irctc.co.in/nget/train-search`,
      confirmTkt: `https://www.confirmtkt.com/rbooking-d/trains/from/${origCode}/to/${destCode}`,
      googleRail: `https://www.google.com/search?q=Train+from+${encodeURIComponent(origCity)}+to+${encodeURIComponent(destCity)}`,
    };
  } else {
    // Bus
    return {
      redBus: `https://www.redbus.in/bus-tickets/${encodeURIComponent(origCity.toLowerCase())}-to-${encodeURIComponent(destCity.toLowerCase())}`,
      abhiBus: `https://www.abhibus.com/bus_search/${encodeURIComponent(origCity)}/${encodeURIComponent(destCity)}`,
    };
  }
}

// GET /api/transport - Search & list transport options with filters and scoring
async function getTransports(req, res, next) {
  try {
    const {
      origin,
      destination,
      date,
      mode,
      class: transportClass,
      operator,
      minPrice,
      maxPrice,
      sortBy = 'recommended',
      style,
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];

    // Filter by Origin (Station code or City name)
    if (origin && origin.trim() !== '' && origin.toLowerCase() !== 'all') {
      const origVal = origin.trim();
      values.push(origVal.toUpperCase());
      values.push(`%${origVal}%`);
      conditions.push(`(t.origin_code = $${values.length - 1} OR s_orig.city ILIKE $${values.length})`);
    }

    // Filter by Destination (Station code or City name)
    if (destination && destination.trim() !== '' && destination.toLowerCase() !== 'all') {
      const destVal = destination.trim();
      values.push(destVal.toUpperCase());
      values.push(`%${destVal}%`);
      conditions.push(`(t.destination_code = $${values.length - 1} OR s_dest.city ILIKE $${values.length})`);
    }

    // Filter by Mode (flight, train, bus)
    if (mode && ['flight', 'train', 'bus'].includes(mode.toLowerCase())) {
      values.push(mode.toLowerCase());
      conditions.push(`t.mode = $${values.length}`);
    }

    // Filter by Departure Date
    if (date && date.trim() !== '') {
      values.push(date.trim());
      conditions.push(`DATE(t.departs_at) = $${values.length}`);
    }

    // Filter by Class
    if (transportClass && transportClass.trim() !== '' && transportClass.toLowerCase() !== 'all') {
      values.push(transportClass.trim());
      conditions.push(`t.class ILIKE $${values.length}`);
    }

    // Filter by Operator
    if (operator && operator.trim() !== '' && operator.toLowerCase() !== 'all') {
      values.push(`%${operator.trim()}%`);
      conditions.push(`t.operator ILIKE $${values.length}`);
    }

    // Filter by Price range
    if (minPrice && !isNaN(minPrice)) {
      values.push(parseFloat(minPrice));
      conditions.push(`t.price >= $${values.length}`);
    }
    if (maxPrice && !isNaN(maxPrice)) {
      values.push(parseFloat(maxPrice));
      conditions.push(`t.price <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countSql = `
      SELECT COUNT(*) AS total
      FROM transport_options t
      LEFT JOIN stations s_orig ON t.origin_code = s_orig.code
      LEFT JOIN stations s_dest ON t.destination_code = s_dest.code
      ${whereClause}
    `;
    const countResult = await db.query(countSql, values);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    let transports = [];

    if (totalCount > 0) {
      if (sortBy === 'recommended') {
        const travelStyleKey = style || (req.user && req.user.travel_style) || 'balanced';
        const weights = TRAVEL_STYLES[travelStyleKey] || TRAVEL_STYLES.balanced;
        const wPrice = weights.w_price;
        const wComfort = weights.w_comfort;

        const recSql = `
          WITH filtered_transports AS (
            SELECT t.*,
                   ROUND(EXTRACT(EPOCH FROM (t.arrives_at - t.departs_at)) / 60)::int AS duration_minutes,
                   s_orig.name AS origin_name, s_orig.city AS origin_city, s_orig.type AS origin_type,
                   s_dest.name AS dest_name, s_dest.city AS dest_city, s_dest.type AS dest_type
            FROM transport_options t
            LEFT JOIN stations s_orig ON t.origin_code = s_orig.code
            LEFT JOIN stations s_dest ON t.destination_code = s_dest.code
            ${whereClause}
          ),
          min_max AS (
            SELECT *,
                   MIN(price) OVER () AS min_price,
                   MAX(price) OVER () AS max_price,
                   MIN(duration_minutes) OVER () AS min_duration,
                   MAX(duration_minutes) OVER () AS max_duration
            FROM filtered_transports
          ),
          scored AS (
            SELECT *,
              CASE 
                WHEN max_price = min_price THEN 1.0
                ELSE (max_price - price)::numeric / NULLIF(max_price - min_price, 0)
              END AS price_score,
              CASE 
                WHEN max_duration = min_duration THEN 1.0
                ELSE (max_duration - duration_minutes)::numeric / NULLIF(max_duration - min_duration, 0)
              END AS duration_score,
              CASE 
                WHEN mode = 'flight' AND class = 'Economy' THEN 0.7
                WHEN mode = 'flight' AND class = 'Business' THEN 1.0
                WHEN mode = 'train' AND class = 'SL' THEN 0.3
                WHEN mode = 'train' AND class = '3AC' THEN 0.6
                WHEN mode = 'train' AND class = '2AC' THEN 0.85
                WHEN mode = 'train' AND class = '1AC' THEN 1.0
                WHEN mode = 'bus' AND class = 'Standard' THEN 0.4
                WHEN mode = 'bus' AND class = 'AC Sleeper' THEN 0.75
                WHEN mode = 'flight' THEN 0.7
                WHEN mode = 'train' THEN 0.6
                WHEN mode = 'bus' THEN 0.5
                ELSE 0.5
              END AS class_score
            FROM min_max
          ),
          final_scored AS (
            SELECT *,
              ROUND((
                ${wPrice} * price_score + 
                ${wComfort} * (0.5 * duration_score + 0.5 * class_score)
              )::numeric, 4) AS recommendation_score
            FROM scored
          ),
          paged AS (
            SELECT * FROM final_scored
            ORDER BY recommendation_score DESC, departs_at ASC
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
          )
          SELECT p.*,
                 COALESCE(sc.total_seats, 0) AS total_seats,
                 COALESCE(sc.available_seats, 0) AS available_seats
          FROM paged p
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS total_seats,
                   COUNT(*) FILTER (WHERE booking_id IS NULL)::int AS available_seats
            FROM seats s
            WHERE s.transport_id = p.id
          ) sc ON true
          ORDER BY p.recommendation_score DESC, p.departs_at ASC
        `;

        const pagedRes = await db.query(recSql, [...values, limitNum, offset]);
        transports = pagedRes.rows.map((r) => {
          const price = parseFloat(r.price);
          const duration = parseInt(r.duration_minutes, 10) || 60;
          const minP = parseFloat(r.min_price);
          const minDur = parseInt(r.min_duration, 10);
          const classScore = parseFloat(r.class_score);
          const durationScore = parseFloat(r.duration_score);
          const priceScore = parseFloat(r.price_score);
          const comfortScore = 0.5 * durationScore + 0.5 * classScore;
          const score = parseFloat(r.recommendation_score);

          // Human-readable explainable reason
          let reason = 'Balanced transit option';
          if (price === minP) {
            reason = `Lowest fare option (${r.mode.toUpperCase()})`;
          } else if (duration === minDur) {
            reason = `Fastest connection (${formatDuration(duration)})`;
          } else if (classScore >= 0.85 && durationScore >= 0.6) {
            reason = 'Top tier comfort & premier arrival';
          } else if (priceScore >= 0.7 && comfortScore >= 0.6) {
            reason = 'Optimal value: affordable & fast';
          }

          return {
            id: r.id,
            mode: r.mode,
            operator: r.operator,
            number: r.number,
            class: r.class,
            price: price,
            departs_at: r.departs_at,
            arrives_at: r.arrives_at,
            duration_minutes: duration,
            duration_formatted: formatDuration(duration),
            origin: {
              code: r.origin_code,
              name: r.origin_name,
              city: r.origin_city,
              type: r.origin_type,
            },
            destination: {
              code: r.destination_code,
              name: r.dest_name,
              city: r.dest_city,
              type: r.dest_type,
            },
            seats: {
              total: parseInt(r.total_seats, 10),
              available: parseInt(r.available_seats, 10),
              has_seat_selection: r.mode === 'flight',
            },
            recommendation_score: score,
            recommendation_reason: reason,
            outboundSearchUrls: getOutboundUrls(r, { city: r.origin_city, code: r.origin_code }, { city: r.dest_city, code: r.destination_code }),
          };
        });
      } else {
        // Standard SQL ordering with deferred seat counts via LATERAL
        let orderBySql = 'ORDER BY departs_at ASC';
        if (sortBy === 'price_asc') {
          orderBySql = 'ORDER BY price ASC, departs_at ASC';
        } else if (sortBy === 'price_desc') {
          orderBySql = 'ORDER BY price DESC, departs_at ASC';
        } else if (sortBy === 'duration_asc') {
          orderBySql = 'ORDER BY duration_minutes ASC, price ASC';
        } else if (sortBy === 'departs_asc') {
          orderBySql = 'ORDER BY departs_at ASC';
        }

        const standardSql = `
          WITH filtered_transports AS (
            SELECT t.*,
                   ROUND(EXTRACT(EPOCH FROM (t.arrives_at - t.departs_at)) / 60)::int AS duration_minutes,
                   s_orig.name AS origin_name, s_orig.city AS origin_city, s_orig.type AS origin_type,
                   s_dest.name AS dest_name, s_dest.city AS dest_city, s_dest.type AS dest_type
            FROM transport_options t
            LEFT JOIN stations s_orig ON t.origin_code = s_orig.code
            LEFT JOIN stations s_dest ON t.destination_code = s_dest.code
            ${whereClause}
          ),
          paged AS (
            SELECT * FROM filtered_transports
            ${orderBySql}
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
          )
          SELECT p.*,
                 COALESCE(sc.total_seats, 0) AS total_seats,
                 COALESCE(sc.available_seats, 0) AS available_seats
          FROM paged p
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS total_seats,
                   COUNT(*) FILTER (WHERE booking_id IS NULL)::int AS available_seats
            FROM seats s
            WHERE s.transport_id = p.id
          ) sc ON true
          ${orderBySql}
        `;

        const pagedRes = await db.query(standardSql, [...values, limitNum, offset]);
        transports = pagedRes.rows.map((r) => {
          const duration = parseInt(r.duration_minutes, 10) || 60;
          return {
            id: r.id,
            mode: r.mode,
            operator: r.operator,
            number: r.number,
            class: r.class,
            price: parseFloat(r.price),
            departs_at: r.departs_at,
            arrives_at: r.arrives_at,
            duration_minutes: duration,
            duration_formatted: formatDuration(duration),
            origin: {
              code: r.origin_code,
              name: r.origin_name,
              city: r.origin_city,
              type: r.origin_type,
            },
            destination: {
              code: r.destination_code,
              name: r.dest_name,
              city: r.dest_city,
              type: r.dest_type,
            },
            seats: {
              total: parseInt(r.total_seats, 10),
              available: parseInt(r.available_seats, 10),
              has_seat_selection: r.mode === 'flight',
            },
            outboundSearchUrls: getOutboundUrls(r, { city: r.origin_city, code: r.origin_code }, { city: r.dest_city, code: r.destination_code }),
          };
        });
      }
    }

    return res.json({
      success: true,
      data: {
        transports,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transport/stations - List all stations for autocomplete/dropdowns
async function getStations(req, res, next) {
  try {
    const { type } = req.query;
    let query = 'SELECT code, name, city, type, lat, lon FROM stations';
    const values = [];

    if (type && ['airport', 'rail', 'bus'].includes(type.toLowerCase())) {
      values.push(type.toLowerCase());
      query += ' WHERE type = $1';
    }

    query += ' ORDER BY city ASC, name ASC';

    const result = await db.query(query, values);
    const stations = result.rows.map((s) => ({
      code: s.code,
      name: s.name,
      city: s.city,
      type: s.type,
      lat: s.lat ? parseFloat(s.lat) : null,
      lon: s.lon ? parseFloat(s.lon) : null,
    }));

    return res.json({
      success: true,
      data: stations,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transport/:id - Single transport details
async function getTransportById(req, res, next) {
  try {
    const transportId = parseInt(req.params.id, 10);
    if (isNaN(transportId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid transport ID format.' },
      });
    }

    const result = await db.query(
      `SELECT t.*,
              ROUND(EXTRACT(EPOCH FROM (t.arrives_at - t.departs_at)) / 60) AS duration_minutes,
              s_orig.name AS origin_name, s_orig.city AS origin_city, s_orig.type AS origin_type,
              s_dest.name AS dest_name, s_dest.city AS dest_city, s_dest.type AS dest_type,
              COALESCE(seat_counts.total_seats, 0) AS total_seats,
              COALESCE(seat_counts.available_seats, 0) AS available_seats
       FROM transport_options t
       LEFT JOIN stations s_orig ON t.origin_code = s_orig.code
       LEFT JOIN stations s_dest ON t.destination_code = s_dest.code
       LEFT JOIN (
         SELECT transport_id, 
                COUNT(*) AS total_seats,
                COUNT(*) FILTER (WHERE booking_id IS NULL) AS available_seats
         FROM seats
         WHERE transport_id = $1
         GROUP BY transport_id
       ) seat_counts ON t.id = seat_counts.transport_id
       WHERE t.id = $1`,
      [transportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transport option not found.' },
      });
    }

    const r = result.rows[0];
    const duration = parseInt(r.duration_minutes, 10) || 60;

    return res.json({
      success: true,
      data: {
        id: r.id,
        mode: r.mode,
        operator: r.operator,
        number: r.number,
        class: r.class,
        price: parseFloat(r.price),
        departs_at: r.departs_at,
        arrives_at: r.arrives_at,
        duration_minutes: duration,
        duration_formatted: formatDuration(duration),
        origin: {
          code: r.origin_code,
          name: r.origin_name,
          city: r.origin_city,
          type: r.origin_type,
        },
        destination: {
          code: r.destination_code,
          name: r.dest_name,
          city: r.dest_city,
          type: r.dest_type,
        },
        seats: {
          total: parseInt(r.total_seats, 10),
          available: parseInt(r.available_seats, 10),
          has_seat_selection: r.mode === 'flight',
        },
        outboundSearchUrls: getOutboundUrls(r, { city: r.origin_city, code: r.origin_code }, { city: r.dest_city, code: r.destination_code }),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/transport/:id/seats - Flight Seat Map
async function getTransportSeats(req, res, next) {
  try {
    const transportId = parseInt(req.params.id, 10);
    if (isNaN(transportId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid transport ID format.' },
      });
    }

    // Verify transport option
    const transportRes = await db.query(
      `SELECT t.id, t.mode, t.operator, t.number, t.class, t.price,
              s_orig.city AS origin_city, s_dest.city AS dest_city
       FROM transport_options t
       LEFT JOIN stations s_orig ON t.origin_code = s_orig.code
       LEFT JOIN stations s_dest ON t.destination_code = s_dest.code
       WHERE t.id = $1`,
      [transportId]
    );

    if (transportRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transport option not found.' },
      });
    }

    const transport = transportRes.rows[0];

    // Fetch seats for this transport
    const seatsRes = await db.query(
      `SELECT id, seat_no, booking_id 
       FROM seats 
       WHERE transport_id = $1 
       ORDER BY 
         CAST(SUBSTRING(seat_no FROM '^[0-9]+') AS INTEGER) ASC,
         SUBSTRING(seat_no FROM '[A-Z]$') ASC`,
      [transportId]
    );

    const rawSeats = seatsRes.rows;
    let availableCount = 0;
    let bookedCount = 0;

    const formattedSeats = rawSeats.map((s) => {
      const match = s.seat_no.match(/^(\d+)([A-Z])$/);
      const rowNum = match ? parseInt(match[1], 10) : 1;
      const colLetter = match ? match[2] : 'A';

      const isBooked = s.booking_id !== null;
      if (isBooked) bookedCount++;
      else availableCount++;

      // Seat classification
      let seatType = 'middle';
      if (colLetter === 'A' || colLetter === 'F') seatType = 'window';
      else if (colLetter === 'C' || colLetter === 'D') seatType = 'aisle';

      // Row 1 to 5: Front/Business; Row 6 to 30: Economy
      const tier = rowNum <= 5 ? 'Business' : 'Economy';

      return {
        id: s.id,
        seat_no: s.seat_no,
        row: rowNum,
        col: colLetter,
        type: seatType,
        tier,
        is_available: !isBooked,
        is_booked: isBooked,
      };
    });

    return res.json({
      success: true,
      data: {
        transport: {
          id: transport.id,
          mode: transport.mode,
          operator: transport.operator,
          number: transport.number,
          class: transport.class,
          price: parseFloat(transport.price),
          route: `${transport.origin_city} → ${transport.dest_city}`,
        },
        summary: {
          total_seats: rawSeats.length,
          available_seats: availableCount,
          booked_seats: bookedCount,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          total_rows: rawSeats.length > 0 ? 30 : 0,
        },
        seats: formattedSeats,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTransports,
  getStations,
  getTransportById,
  getTransportSeats,
};
