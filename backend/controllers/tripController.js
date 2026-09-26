const db = require('../config/db');

// GET /api/trips - List all trips accessible by current user
async function getMyTrips(req, res, next) {
  try {
    const result = await db.query(
      `SELECT t.id, t.name, t.created_by, t.start_date, t.end_date, t.budget, t.base_currency, t.created_at,
              COALESCE(tm.role, CASE WHEN t.created_by = $1 THEN 'owner' ELSE 'member' END) AS role,
              COUNT(DISTINCT b.id) AS booking_count
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       LEFT JOIN bookings b ON t.id = b.trip_id
       WHERE t.created_by = $1 OR tm.user_id = $1
       GROUP BY t.id, tm.role
       ORDER BY t.start_date ASC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        created_by: row.created_by,
        start_date: row.start_date,
        end_date: row.end_date,
        budget: parseFloat(row.budget),
        base_currency: row.base_currency,
        created_at: row.created_at,
        role: row.role,
        booking_count: parseInt(row.booking_count, 10),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trips - Create a new trip
async function createTrip(req, res, next) {
  try {
    const { name, start_date, end_date, budget = 0, base_currency = 'INR' } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Trip name, start date, and end date are required.' },
      });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        error: { message: 'End date cannot be earlier than start date.' },
      });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tripResult = await client.query(
        `INSERT INTO trips (name, created_by, start_date, end_date, budget, base_currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name.trim(), req.user.id, start_date, end_date, parseFloat(budget) || 0, base_currency]
      );

      const trip = tripResult.rows[0];

      // Add owner to trip_members
      await client.query(
        `INSERT INTO trip_members (trip_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (trip_id, user_id) DO NOTHING`,
        [trip.id, req.user.id]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        data: {
          ...trip,
          budget: parseFloat(trip.budget),
          role: 'owner',
          booking_count: 0,
        },
        message: 'Trip created successfully.',
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// GET /api/trips/:id - Get trip details with IDOR protection
async function getTripById(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid trip ID format.' },
      });
    }

    // IDOR check: user must be creator or member
    const tripResult = await db.query(
      `SELECT t.*, tm.role 
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       WHERE t.id = $2 AND (t.created_by = $1 OR tm.user_id = $1)`,
      [req.user.id, tripId]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or unauthorized.' },
      });
    }

    const trip = tripResult.rows[0];

    // Fetch members
    const membersResult = await db.query(
      `SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.email 
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.trip_id = $1`,
      [tripId]
    );

    // Fetch bookings for this trip
    const bookingsResult = await db.query(
      `SELECT b.*, h.name AS hotel_name, h.city AS hotel_city, h.image_url AS hotel_image_url
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       WHERE b.trip_id = $1
       ORDER BY b.created_at DESC`,
      [tripId]
    );

    return res.json({
      success: true,
      data: {
        ...trip,
        budget: parseFloat(trip.budget),
        members: membersResult.rows,
        bookings: bookingsResult.rows.map((b) => ({
          ...b,
          amount: parseFloat(b.amount),
          amount_base: parseFloat(b.amount_base),
          rate_used: parseFloat(b.rate_used),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyTrips,
  createTrip,
  getTripById,
};
