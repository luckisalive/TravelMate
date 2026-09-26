const db = require('../config/db');

// GET /api/trips - List all trips accessible by current user
async function getMyTrips(req, res, next) {
  try {
    const result = await db.query(
      `SELECT t.id, t.name, t.created_by, t.start_date, t.end_date, t.budget, t.base_currency, t.created_at,
              COALESCE(tm.role, CASE WHEN t.created_by = $1 THEN 'owner' ELSE 'member' END) AS role,
              COUNT(DISTINCT b.id) FILTER (WHERE b.status <> 'cancelled') AS booking_count,
              COUNT(DISTINCT e.id) AS expense_count,
              COALESCE(SUM(DISTINCT CASE WHEN b.status <> 'cancelled' THEN b.amount_base ELSE 0 END), 0) AS total_bookings_base,
              COALESCE(
                (SELECT SUM(e2.amount_base) FROM expenses e2 WHERE e2.trip_id = t.id),
                0
              ) AS total_expenses_base
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       LEFT JOIN bookings b ON t.id = b.trip_id
       LEFT JOIN expenses e ON t.id = e.trip_id
       WHERE t.created_by = $1 OR tm.user_id = $1
       GROUP BY t.id, tm.role
       ORDER BY t.start_date ASC`,
      [req.user.id]
    );

    const today = new Date().toISOString().split('T')[0];

    const trips = result.rows.map((row) => {
      const budget = parseFloat(row.budget) || 0;
      const totalBookings = parseFloat(row.total_bookings_base) || 0;
      const totalExpenses = parseFloat(row.total_expenses_base) || 0;
      const totalSpent = parseFloat((totalBookings + totalExpenses).toFixed(2));
      const remainingBudget = parseFloat((budget - totalSpent).toFixed(2));
      const budgetUtilizationPct = budget > 0 ? parseFloat(((totalSpent / budget) * 100).toFixed(1)) : 0;

      const startDateStr = typeof row.start_date === 'string' ? row.start_date.split('T')[0] : new Date(row.start_date).toISOString().split('T')[0];
      const endDateStr = typeof row.end_date === 'string' ? row.end_date.split('T')[0] : new Date(row.end_date).toISOString().split('T')[0];

      let status = 'upcoming';
      if (endDateStr < today) {
        status = 'completed';
      } else if (startDateStr <= today && endDateStr >= today) {
        status = 'active';
      }

      const diffTime = Math.abs(new Date(endDateStr) - new Date(startDateStr));
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: row.id,
        name: row.name,
        created_by: row.created_by,
        start_date: startDateStr,
        end_date: endDateStr,
        duration_days: durationDays,
        status,
        budget,
        base_currency: row.base_currency,
        created_at: row.created_at,
        role: row.role,
        booking_count: parseInt(row.booking_count, 10) || 0,
        expense_count: parseInt(row.expense_count, 10) || 0,
        total_bookings_base: totalBookings,
        total_expenses_base: totalExpenses,
        total_spent_base: totalSpent,
        remaining_budget: remainingBudget,
        budget_utilization_pct: budgetUtilizationPct,
        is_over_budget: budget > 0 && totalSpent > budget,
      };
    });

    return res.json({
      success: true,
      data: trips,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trips - Create a new trip
async function createTrip(req, res, next) {
  try {
    const { name, start_date, end_date, budget = 0, base_currency = 'INR' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Trip name is required.' },
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Trip start date and end date are required.' },
      });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid date format. Use YYYY-MM-DD.' },
      });
    }

    if (endDateObj < startDateObj) {
      return res.status(400).json({
        success: false,
        error: { message: 'End date cannot be earlier than start date.' },
      });
    }

    const parsedBudget = Math.max(0, parseFloat(budget) || 0);
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const tripResult = await client.query(
        `INSERT INTO trips (name, created_by, start_date, end_date, budget, base_currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name.trim(), req.user.id, start_date, end_date, parsedBudget, (base_currency || 'INR').toUpperCase()]
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
          expense_count: 0,
          total_spent_base: 0,
          remaining_budget: parseFloat(trip.budget),
          budget_utilization_pct: 0,
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
      `SELECT t.*, 
              COALESCE(tm.role, CASE WHEN t.created_by = $1 THEN 'owner' ELSE 'member' END) AS user_role,
              u.name AS creator_name,
              u.email AS creator_email
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       JOIN users u ON t.created_by = u.id
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
      `SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.email, u.currency_pref
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.trip_id = $1
       ORDER BY tm.role DESC, tm.joined_at ASC`,
      [tripId]
    );

    // Fetch bookings for this trip
    const bookingsResult = await db.query(
      `SELECT b.*, 
              h.name AS hotel_name, h.city AS hotel_city, h.image_url AS hotel_image_url, h.stars AS hotel_stars,
              t_opt.mode AS transport_mode, t_opt.operator AS transport_operator, t_opt.number AS transport_number,
              t_opt.origin_code AS transport_origin, t_opt.destination_code AS transport_destination,
              t_opt.departs_at AS transport_departs, t_opt.arrives_at AS transport_arrives, t_opt.class AS transport_class,
              s.seat_no
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options t_opt ON b.transport_id = t_opt.id
       LEFT JOIN seats s ON s.booking_id = b.id
       WHERE b.trip_id = $1
       ORDER BY b.created_at DESC`,
      [tripId]
    );

    // Fetch expenses for this trip
    const expensesResult = await db.query(
      `SELECT e.*, u.name AS paid_by_name, u.email AS paid_by_email
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.trip_id = $1
       ORDER BY e.date DESC, e.created_at DESC`,
      [tripId]
    );

    const budget = parseFloat(trip.budget) || 0;

    // Financial summaries
    const confirmedBookings = bookingsResult.rows.filter((b) => b.status !== 'cancelled');
    const totalBookingsBase = confirmedBookings.reduce((sum, b) => sum + parseFloat(b.amount_base), 0);
    const totalExpensesBase = expensesResult.rows.reduce((sum, e) => sum + parseFloat(e.amount_base), 0);
    const totalSpentBase = parseFloat((totalBookingsBase + totalExpensesBase).toFixed(2));
    const remainingBudget = parseFloat((budget - totalSpentBase).toFixed(2));
    const budgetUtilizationPct = budget > 0 ? parseFloat(((totalSpentBase / budget) * 100).toFixed(1)) : 0;

    // Category breakdown
    const categoryTotals = {};
    for (const exp of expensesResult.rows) {
      const cat = exp.category;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(exp.amount_base);
    }

    const byCategory = Object.entries(categoryTotals).map(([cat, amt]) => ({
      category: cat,
      amount_base: parseFloat(amt.toFixed(2)),
      percentage: totalExpensesBase > 0 ? parseFloat(((amt / totalExpensesBase) * 100).toFixed(1)) : 0,
    }));

    return res.json({
      success: true,
      data: {
        id: trip.id,
        name: trip.name,
        created_by: trip.created_by,
        creator_name: trip.creator_name,
        creator_email: trip.creator_email,
        start_date: trip.start_date,
        end_date: trip.end_date,
        budget,
        base_currency: trip.base_currency,
        user_role: trip.user_role,
        created_at: trip.created_at,
        members: membersResult.rows,
        bookings: bookingsResult.rows.map((b) => ({
          ...b,
          amount: parseFloat(b.amount),
          amount_base: parseFloat(b.amount_base),
          rate_used: parseFloat(b.rate_used),
        })),
        expenses: expensesResult.rows.map((e) => ({
          ...e,
          amount: parseFloat(e.amount),
          amount_base: parseFloat(e.amount_base),
          rate_used: parseFloat(e.rate_used),
        })),
        summary: {
          total_budget: budget,
          total_bookings_base: totalBookingsBase,
          total_expenses_base: totalExpensesBase,
          total_spent_base: totalSpentBase,
          remaining_budget: remainingBudget,
          budget_utilization_pct: budgetUtilizationPct,
          is_over_budget: budget > 0 && totalSpentBase > budget,
          by_category: byCategory,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trips/:id - Update trip details
async function updateTrip(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid trip ID format.' },
      });
    }

    // Verify ownership or admin role in trip_members
    const checkResult = await db.query(
      `SELECT t.id, t.created_by, tm.role 
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       WHERE t.id = $2`,
      [req.user.id, tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or unauthorized.' },
      });
    }

    const { name, start_date, end_date, budget, base_currency } = req.body;
    const currentTrip = checkResult.rows[0];
    const isOwner = currentTrip.created_by === req.user.id || currentTrip.role === 'owner';

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the trip owner can update trip settings.' },
      });
    }

    // Validate dates if provided
    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        error: { message: 'End date cannot be earlier than start date.' },
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Trip name cannot be blank.' } });
      }
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name.trim());
    }

    if (start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`);
      updateValues.push(start_date);
    }

    if (end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex++}`);
      updateValues.push(end_date);
    }

    if (budget !== undefined) {
      const parsedBudget = Math.max(0, parseFloat(budget) || 0);
      updateFields.push(`budget = $${paramIndex++}`);
      updateValues.push(parsedBudget);
    }

    if (base_currency !== undefined) {
      updateFields.push(`base_currency = $${paramIndex++}`);
      updateValues.push((base_currency || 'INR').toUpperCase());
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields provided to update.' },
      });
    }

    updateValues.push(tripId);
    const updateQuery = `
      UPDATE trips 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedResult = await db.query(updateQuery, updateValues);
    const updatedTrip = updatedResult.rows[0];

    return res.json({
      success: true,
      data: {
        ...updatedTrip,
        budget: parseFloat(updatedTrip.budget),
      },
      message: 'Trip updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/:id - Delete trip with IDOR protection
async function deleteTrip(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid trip ID format.' },
      });
    }

    const checkResult = await db.query(
      `SELECT created_by FROM trips WHERE id = $1`,
      [tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or unauthorized.' },
      });
    }

    if (checkResult.rows[0].created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the trip creator can delete this trip.' },
      });
    }

    await db.query(`DELETE FROM trips WHERE id = $1`, [tripId]);

    return res.json({
      success: true,
      message: 'Trip and associated bookings/expenses deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trips/:id/members - Add member to trip
async function addTripMember(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const { email, role = 'member' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Member email is required.' },
      });
    }

    // Verify requesting user is owner
    const tripCheck = await db.query(
      `SELECT t.id, t.created_by, tm.role 
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       WHERE t.id = $2`,
      [req.user.id, tripId]
    );

    if (tripCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or unauthorized.' },
      });
    }

    const isOwner = tripCheck.rows[0].created_by === req.user.id || tripCheck.rows[0].role === 'owner';
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the trip owner can invite members.' },
      });
    }

    // Look up target user
    const userResult = await db.query(
      `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: `No registered user found with email ${email}. Companion must create an account first.` },
      });
    }

    const targetUser = userResult.rows[0];

    // Add to trip_members
    await db.query(
      `INSERT INTO trip_members (trip_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, user_id) 
       DO UPDATE SET role = EXCLUDED.role`,
      [tripId, targetUser.id, role === 'owner' ? 'owner' : 'member']
    );

    return res.status(201).json({
      success: true,
      data: {
        trip_id: tripId,
        user_id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: role === 'owner' ? 'owner' : 'member',
      },
      message: `${targetUser.name} added to the trip.`,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/:id/members/:userId - Remove member
async function removeTripMember(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);

    const tripCheck = await db.query(
      `SELECT t.id, t.created_by, tm.role 
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       WHERE t.id = $2`,
      [req.user.id, tripId]
    );

    if (tripCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or unauthorized.' },
      });
    }

    if (tripCheck.rows[0].created_by === targetUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'The creator of the trip cannot be removed from members.' },
      });
    }

    const isOwner = tripCheck.rows[0].created_by === req.user.id || tripCheck.rows[0].role === 'owner';
    const isSelf = req.user.id === targetUserId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to remove this member.' },
      });
    }

    await db.query(
      `DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2`,
      [tripId, targetUserId]
    );

    return res.json({
      success: true,
      message: 'Member removed from trip.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyTrips,
  createTrip,
  getTripById,
  updateTrip,
  deleteTrip,
  addTripMember,
  removeTripMember,
};
