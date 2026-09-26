const db = require('../config/db');
const { convertToBase } = require('../utils/currency');

const VALID_CATEGORIES = ['Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other'];

// Helper to verify user has access to trip
async function verifyTripMembership(userId, tripId) {
  const result = await db.query(
    `SELECT t.id, t.name, t.budget, t.base_currency, t.created_by, tm.role
     FROM trips t
     LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
     WHERE t.id = $2 AND (t.created_by = $1 OR tm.user_id = $1)`,
    [userId, tripId]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

// GET /api/trips/:id/expenses - List all expenses for a trip
async function getTripExpenses(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const { category, paid_by, startDate, endDate, search } = req.query;

    let queryText = `
      SELECT e.*, u.name AS paid_by_name, u.email AS paid_by_email
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.trip_id = $1
    `;
    const params = [tripId];
    let pIdx = 2;

    if (category) {
      queryText += ` AND LOWER(e.category) = LOWER($${pIdx++})`;
      params.push(category);
    }

    if (paid_by) {
      queryText += ` AND e.paid_by = $${pIdx++}`;
      params.push(parseInt(paid_by, 10));
    }

    if (startDate) {
      queryText += ` AND e.date >= $${pIdx++}`;
      params.push(startDate);
    }

    if (endDate) {
      queryText += ` AND e.date <= $${pIdx++}`;
      params.push(endDate);
    }

    if (search && search.trim()) {
      queryText += ` AND (LOWER(e.note) LIKE $${pIdx++} OR LOWER(e.category) LIKE $${pIdx++})`;
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }

    queryText += ` ORDER BY e.date DESC, e.created_at DESC`;

    const result = await db.query(queryText, params);

    const expenses = result.rows.map((row) => ({
      id: row.id,
      trip_id: row.trip_id,
      paid_by: row.paid_by,
      paid_by_name: row.paid_by_name,
      paid_by_email: row.paid_by_email,
      category: row.category,
      amount: parseFloat(row.amount),
      currency: row.currency,
      amount_base: parseFloat(row.amount_base),
      rate_used: parseFloat(row.rate_used),
      date: typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0],
      note: row.note || '',
      created_at: row.created_at,
    }));

    return res.json({
      success: true,
      data: expenses,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trips/:id/expenses - Create new expense with server-side currency conversion
async function createExpense(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const { category, amount, currency, date, note, paid_by } = req.body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: { message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Amount must be a positive number greater than 0.' },
      });
    }

    // Determine payer
    let payerId = req.user.id;
    if (paid_by) {
      const parsedPayer = parseInt(paid_by, 10);
      // Verify payer is member of trip
      const payerCheck = await db.query(
        `SELECT u.id FROM users u
         JOIN trip_members tm ON u.id = tm.user_id
         WHERE tm.trip_id = $1 AND u.id = $2
         UNION
         SELECT created_by FROM trips WHERE id = $1 AND created_by = $2`,
        [tripId, parsedPayer]
      );
      if (payerCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'The specified payer is not a member of this trip.' },
        });
      }
      payerId = parsedPayer;
    }

    // Default currency to user preference or INR
    const targetCurrency = (currency || req.user.display_currency || 'INR').trim().toUpperCase();
    const expenseDate = date || new Date().toISOString().split('T')[0];

    // Server-side conversion to amount_base (ADR-004)
    const { amount: savedAmount, currency: savedCurrency, amount_base, rate_used } =
      await convertToBase(numAmount, targetCurrency);

    const insertResult = await db.query(
      `INSERT INTO expenses (trip_id, paid_by, category, amount, currency, amount_base, rate_used, date, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [tripId, payerId, category, savedAmount, savedCurrency, amount_base, rate_used, expenseDate, (note || '').trim()]
    );

    const createdExpense = insertResult.rows[0];

    // Fetch payer info for response
    const payerInfo = await db.query(`SELECT name, email FROM users WHERE id = $1`, [payerId]);

    return res.status(201).json({
      success: true,
      data: {
        ...createdExpense,
        amount: parseFloat(createdExpense.amount),
        amount_base: parseFloat(createdExpense.amount_base),
        rate_used: parseFloat(createdExpense.rate_used),
        paid_by_name: payerInfo.rows[0]?.name || req.user.name,
        paid_by_email: payerInfo.rows[0]?.email || req.user.email,
      },
      message: 'Expense logged successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trips/:id/expenses/:expenseId - Get single expense
async function getExpenseById(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const expenseId = parseInt(req.params.expenseId, 10);

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const result = await db.query(
      `SELECT e.*, u.name AS paid_by_name, u.email AS paid_by_email
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.id = $1 AND e.trip_id = $2`,
      [expenseId, tripId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Expense not found.' } });
    }

    const exp = result.rows[0];
    return res.json({
      success: true,
      data: {
        ...exp,
        amount: parseFloat(exp.amount),
        amount_base: parseFloat(exp.amount_base),
        rate_used: parseFloat(exp.rate_used),
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trips/:id/expenses/:expenseId - Update expense
async function updateExpense(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const expenseId = parseInt(req.params.expenseId, 10);

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const existingResult = await db.query(
      `SELECT * FROM expenses WHERE id = $1 AND trip_id = $2`,
      [expenseId, tripId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Expense not found.' } });
    }

    const existingExpense = existingResult.rows[0];
    const isPayer = existingExpense.paid_by === req.user.id;
    const isOwner = trip.created_by === req.user.id || trip.role === 'owner';

    if (!isPayer && !isOwner) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the payer or trip owner can update this expense.' },
      });
    }

    const { category, amount, currency, date, note, paid_by } = req.body;

    const updateFields = [];
    const updateValues = [];
    let pIdx = 1;

    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          error: { message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        });
      }
      updateFields.push(`category = $${pIdx++}`);
      updateValues.push(category);
    }

    if (note !== undefined) {
      updateFields.push(`note = $${pIdx++}`);
      updateValues.push((note || '').trim());
    }

    if (date !== undefined) {
      updateFields.push(`date = $${pIdx++}`);
      updateValues.push(date);
    }

    if (paid_by !== undefined) {
      const parsedPayer = parseInt(paid_by, 10);
      const payerCheck = await db.query(
        `SELECT u.id FROM users u
         JOIN trip_members tm ON u.id = tm.user_id
         WHERE tm.trip_id = $1 AND u.id = $2
         UNION
         SELECT created_by FROM trips WHERE id = $1 AND created_by = $2`,
        [tripId, parsedPayer]
      );
      if (payerCheck.rows.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Payer must be a member of this trip.' } });
      }
      updateFields.push(`paid_by = $${pIdx++}`);
      updateValues.push(parsedPayer);
    }

    // If amount or currency changed, recompute amount_base and rate_used
    if (amount !== undefined || currency !== undefined) {
      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(existingExpense.amount);
      const newCurrency = currency !== undefined ? currency.trim().toUpperCase() : existingExpense.currency;

      if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).json({ success: false, error: { message: 'Amount must be greater than 0.' } });
      }

      const conversion = await convertToBase(newAmount, newCurrency);
      updateFields.push(`amount = $${pIdx++}`);
      updateValues.push(conversion.amount);

      updateFields.push(`currency = $${pIdx++}`);
      updateValues.push(conversion.currency);

      updateFields.push(`amount_base = $${pIdx++}`);
      updateValues.push(conversion.amount_base);

      updateFields.push(`rate_used = $${pIdx++}`);
      updateValues.push(conversion.rate_used);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No fields provided for update.' } });
    }

    updateValues.push(expenseId, tripId);
    const updateQuery = `
      UPDATE expenses
      SET ${updateFields.join(', ')}
      WHERE id = $${pIdx++} AND trip_id = $${pIdx++}
      RETURNING *
    `;

    const updatedResult = await db.query(updateQuery, updateValues);
    const updated = updatedResult.rows[0];

    const payerInfo = await db.query(`SELECT name, email FROM users WHERE id = $1`, [updated.paid_by]);

    return res.json({
      success: true,
      data: {
        ...updated,
        amount: parseFloat(updated.amount),
        amount_base: parseFloat(updated.amount_base),
        rate_used: parseFloat(updated.rate_used),
        paid_by_name: payerInfo.rows[0]?.name || '',
        paid_by_email: payerInfo.rows[0]?.email || '',
      },
      message: 'Expense updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/:id/expenses/:expenseId - Delete expense
async function deleteExpense(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const expenseId = parseInt(req.params.expenseId, 10);

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const checkResult = await db.query(
      `SELECT paid_by FROM expenses WHERE id = $1 AND trip_id = $2`,
      [expenseId, tripId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Expense not found.' } });
    }

    const isPayer = checkResult.rows[0].paid_by === req.user.id;
    const isOwner = trip.created_by === req.user.id || trip.role === 'owner';

    if (!isPayer && !isOwner) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the payer or trip owner can delete this expense.' },
      });
    }

    await db.query(`DELETE FROM expenses WHERE id = $1 AND trip_id = $2`, [expenseId, tripId]);

    return res.json({
      success: true,
      message: 'Expense deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trips/:id/expenses/analytics - Comprehensive spending analytics
async function getExpenseAnalytics(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const budget = parseFloat(trip.budget) || 0;

    // Fetch all expenses
    const expensesResult = await db.query(
      `SELECT e.*, u.name AS paid_by_name, u.email AS paid_by_email
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.trip_id = $1
       ORDER BY e.date ASC`,
      [tripId]
    );

    // Fetch all confirmed bookings
    const bookingsResult = await db.query(
      `SELECT b.*, 
              CASE WHEN b.hotel_id IS NOT NULL THEN 'Stay' ELSE 'Transport' END AS booking_category
       FROM bookings b
       WHERE b.trip_id = $1 AND b.status <> 'cancelled'`,
      [tripId]
    );

    const totalExpensesBase = expensesResult.rows.reduce((sum, e) => sum + parseFloat(e.amount_base), 0);
    const totalBookingsBase = bookingsResult.rows.reduce((sum, b) => sum + parseFloat(b.amount_base), 0);
    const totalSpentBase = parseFloat((totalExpensesBase + totalBookingsBase).toFixed(2));
    const remainingBudget = parseFloat((budget - totalSpentBase).toFixed(2));
    const budgetUtilizationPct = budget > 0 ? parseFloat(((totalSpentBase / budget) * 100).toFixed(1)) : 0;

    // Category breakdown (pure expenses)
    const expenseCategories = {};
    for (const exp of expensesResult.rows) {
      const cat = exp.category;
      expenseCategories[cat] = (expenseCategories[cat] || 0) + parseFloat(exp.amount_base);
    }

    const expenseCategoryData = Object.entries(expenseCategories).map(([category, amount]) => ({
      category,
      amount_base: parseFloat(amount.toFixed(2)),
      count: expensesResult.rows.filter((e) => e.category === category).length,
      percentage: totalExpensesBase > 0 ? parseFloat(((amount / totalExpensesBase) * 100).toFixed(1)) : 0,
    }));

    // Combined category breakdown (expenses + bookings)
    const combinedCategories = { ...expenseCategories };
    for (const b of bookingsResult.rows) {
      const cat = b.booking_category;
      combinedCategories[cat] = (combinedCategories[cat] || 0) + parseFloat(b.amount_base);
    }

    const combinedCategoryData = Object.entries(combinedCategories).map(([category, amount]) => ({
      category,
      amount_base: parseFloat(amount.toFixed(2)),
      percentage: totalSpentBase > 0 ? parseFloat(((amount / totalSpentBase) * 100).toFixed(1)) : 0,
    }));

    // Daily spending trend
    const dailyMap = {};
    for (const exp of expensesResult.rows) {
      const dateStr = typeof exp.date === 'string' ? exp.date.split('T')[0] : new Date(exp.date).toISOString().split('T')[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + parseFloat(exp.amount_base);
    }

    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount_base]) => ({
        date,
        amount_base: parseFloat(amount_base.toFixed(2)),
      }));

    // Payer breakdown
    const payerMap = {};
    for (const exp of expensesResult.rows) {
      if (!payerMap[exp.paid_by]) {
        payerMap[exp.paid_by] = {
          user_id: exp.paid_by,
          name: exp.paid_by_name,
          email: exp.paid_by_email,
          total_base: 0,
          count: 0,
        };
      }
      payerMap[exp.paid_by].total_base += parseFloat(exp.amount_base);
      payerMap[exp.paid_by].count += 1;
    }

    const payerBreakdown = Object.values(payerMap).map((p) => ({
      user_id: p.user_id,
      name: p.name,
      email: p.email,
      amount_base: parseFloat(p.total_base.toFixed(2)),
      count: p.count,
      percentage: totalExpensesBase > 0 ? parseFloat(((p.total_base / totalExpensesBase) * 100).toFixed(1)) : 0,
    }));

    return res.json({
      success: true,
      data: {
        trip_id: trip.id,
        trip_name: trip.name,
        budget,
        base_currency: trip.base_currency,
        total_expenses_base: parseFloat(totalExpensesBase.toFixed(2)),
        total_bookings_base: parseFloat(totalBookingsBase.toFixed(2)),
        total_spent_base: totalSpentBase,
        remaining_budget: remainingBudget,
        budget_utilization_pct: budgetUtilizationPct,
        is_over_budget: budget > 0 && totalSpentBase > budget,
        categories: expenseCategoryData,
        combined_categories: combinedCategoryData,
        daily_trend: dailyTrend,
        payer_breakdown: payerBreakdown,
        total_expense_count: expensesResult.rows.length,
        total_booking_count: bookingsResult.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTripExpenses,
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseAnalytics,
};
