const db = require('../config/db');
const { convertToBase } = require('../utils/currency');

const VALID_CATEGORIES = ['Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other'];

// Helper to verify user has access to trip (IDOR protection per ADR-010)
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

/**
 * Resolves and validates split rows for an expense.
 * Handles equal split with penny distribution, custom splits with sum verification, or none.
 */
async function resolveSplits({ client, tripId, totalAmount, amountBase, splitType = 'equal', splits, splitMembers, payerId }) {
  if (splitType === 'none' || splitType === 'personal') {
    return { splits: [], split_type: 'none' };
  }

  // Get all valid members of the trip (creator + trip_members)
  const membersRes = await client.query(
    `SELECT DISTINCT u.id, u.name, u.email
     FROM users u
     LEFT JOIN trip_members tm ON u.id = tm.user_id AND tm.trip_id = $1
     JOIN trips t ON t.id = $1
     WHERE u.id = t.created_by OR tm.trip_id = $1`,
    [tripId]
  );
  const tripMembers = membersRes.rows;
  const memberIdSet = new Set(tripMembers.map((m) => m.id));

  const resolvedSplits = [];

  if (splitType === 'custom') {
    if (!Array.isArray(splits) || splits.length === 0) {
      const err = new Error('Custom splits must be provided as a non-empty array of { user_id, amount_owed }.');
      err.status = 400;
      throw err;
    }

    let sumOwed = 0;
    for (const s of splits) {
      const uId = parseInt(s.user_id, 10);
      const owed = parseFloat(s.amount_owed);
      if (isNaN(uId) || !memberIdSet.has(uId)) {
        const err = new Error(`User ID ${s.user_id} in splits is not an active member of this trip.`);
        err.status = 400;
        throw err;
      }
      if (isNaN(owed) || owed <= 0) {
        const err = new Error('Split amount for each member must be a positive number greater than 0.');
        err.status = 400;
        throw err;
      }
      sumOwed += owed;
    }

    // Check sum of custom splits equals totalAmount (with 0.05 float tolerance)
    if (Math.abs(sumOwed - totalAmount) > 0.05) {
      const err = new Error(`Sum of split amounts (${sumOwed.toFixed(2)}) must equal total expense amount (${totalAmount.toFixed(2)}).`);
      err.status = 400;
      throw err;
    }

    // Allocate base amounts proportionately
    let totalAllocatedBase = 0;
    for (let i = 0; i < splits.length; i++) {
      const s = splits[i];
      const uId = parseInt(s.user_id, 10);
      const owed = parseFloat(parseFloat(s.amount_owed).toFixed(2));
      let owedBase;

      if (i === splits.length - 1) {
        // Last split absorbs any penny discrepancy in amountBase
        owedBase = parseFloat((amountBase - totalAllocatedBase).toFixed(2));
      } else {
        owedBase = parseFloat(((owed / totalAmount) * amountBase).toFixed(2));
        totalAllocatedBase += owedBase;
      }

      const memInfo = tripMembers.find((m) => m.id === uId);
      resolvedSplits.push({
        user_id: uId,
        user_name: memInfo ? memInfo.name : '',
        user_email: memInfo ? memInfo.email : '',
        amount_owed: owed,
        amount_owed_base: owedBase,
      });
    }

    return { splits: resolvedSplits, split_type: 'custom' };
  }

  // Otherwise: Equal split
  // Determine participants: splitMembers, or splits array with user_ids, or all trip members
  let targetUserIds = [];
  if (Array.isArray(splitMembers) && splitMembers.length > 0) {
    targetUserIds = splitMembers.map((id) => parseInt(id, 10));
  } else if (Array.isArray(splits) && splits.length > 0) {
    targetUserIds = splits.map((s) => (typeof s === 'object' ? parseInt(s.user_id, 10) : parseInt(s, 10)));
  } else {
    targetUserIds = tripMembers.map((m) => m.id);
  }

  // Deduplicate
  targetUserIds = [...new Set(targetUserIds)];

  for (const uId of targetUserIds) {
    if (!memberIdSet.has(uId)) {
      const err = new Error(`User ID ${uId} is not a member of this trip.`);
      err.status = 400;
      throw err;
    }
  }

  const numParticipants = targetUserIds.length;
  if (numParticipants === 0) {
    return { splits: [], split_type: 'none' };
  }

  // Distribute totalAmount in integer cents to ensure exact sum
  const totalCents = Math.round(totalAmount * 100);
  const baseShareCents = Math.floor(totalCents / numParticipants);
  const remainderCents = totalCents % numParticipants;

  // Distribute amountBase in integer cents
  const totalBaseCents = Math.round(amountBase * 100);
  const baseShareBaseCents = Math.floor(totalBaseCents / numParticipants);
  const remainderBaseCents = totalBaseCents % numParticipants;

  for (let i = 0; i < numParticipants; i++) {
    const uId = targetUserIds[i];
    const shareCents = baseShareCents + (i < remainderCents ? 1 : 0);
    const shareBaseCents = baseShareBaseCents + (i < remainderBaseCents ? 1 : 0);

    const memInfo = tripMembers.find((m) => m.id === uId);
    resolvedSplits.push({
      user_id: uId,
      user_name: memInfo ? memInfo.name : '',
      user_email: memInfo ? memInfo.email : '',
      amount_owed: parseFloat((shareCents / 100).toFixed(2)),
      amount_owed_base: parseFloat((shareBaseCents / 100).toFixed(2)),
    });
  }

  return { splits: resolvedSplits, split_type: 'equal' };
}

// GET /api/trips/:id/expenses - List all expenses for a trip with attached split details
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

    // Fetch all splits for this trip's expenses
    const splitsResult = await db.query(
      `SELECT es.id, es.expense_id, es.user_id, es.amount_owed, es.amount_owed_base,
              u.name AS user_name, u.email AS user_email
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.trip_id = $1
       ORDER BY es.id ASC`,
      [tripId]
    );

    const splitsByExpense = {};
    for (const s of splitsResult.rows) {
      if (!splitsByExpense[s.expense_id]) {
        splitsByExpense[s.expense_id] = [];
      }
      splitsByExpense[s.expense_id].push({
        id: s.id,
        user_id: s.user_id,
        user_name: s.user_name,
        user_email: s.user_email,
        amount_owed: parseFloat(s.amount_owed),
        amount_owed_base: parseFloat(s.amount_owed_base),
      });
    }

    const expenses = result.rows.map((row) => {
      const expSplits = splitsByExpense[row.id] || [];
      let splitType = 'none';
      if (expSplits.length > 0) {
        const firstAmt = expSplits[0].amount_owed;
        const allEqual = expSplits.every((s) => Math.abs(s.amount_owed - firstAmt) <= 0.02);
        splitType = allEqual ? 'equal' : 'custom';
      }

      return {
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
        split_type: splitType,
        splits: expSplits,
      };
    });

    return res.json({
      success: true,
      data: expenses,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trips/:id/expenses - Create new expense with server-side conversion & group splitting
async function createExpense(req, res, next) {
  const client = await db.getClient();
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const { category, amount, currency, date, note, paid_by, split_type = 'equal', splits, split_members } = req.body;

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
      const payerCheck = await client.query(
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

    await client.query('BEGIN');

    // Resolve split allocations
    const splitResult = await resolveSplits({
      client,
      tripId,
      totalAmount: savedAmount,
      amountBase: amount_base,
      splitType: split_type,
      splits,
      splitMembers: split_members,
      payerId,
    });

    const insertResult = await client.query(
      `INSERT INTO expenses (trip_id, paid_by, category, amount, currency, amount_base, rate_used, date, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [tripId, payerId, category, savedAmount, savedCurrency, amount_base, rate_used, expenseDate, (note || '').trim()]
    );

    const createdExpense = insertResult.rows[0];

    // Insert split rows into expense_splits
    const insertedSplits = [];
    for (const s of splitResult.splits) {
      const splitInsert = await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, amount_owed_base)
         VALUES ($1, $2, $3, $4)
         RETURNING id, expense_id, user_id, amount_owed, amount_owed_base`,
        [createdExpense.id, s.user_id, s.amount_owed, s.amount_owed_base]
      );
      insertedSplits.push({
        ...splitInsert.rows[0],
        amount_owed: parseFloat(splitInsert.rows[0].amount_owed),
        amount_owed_base: parseFloat(splitInsert.rows[0].amount_owed_base),
        user_name: s.user_name,
        user_email: s.user_email,
      });
    }

    await client.query('COMMIT');

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
        split_type: splitResult.split_type,
        splits: insertedSplits,
      },
      message: 'Expense logged successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) {
      return res.status(err.status).json({ success: false, error: { message: err.message } });
    }
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/trips/:id/expenses/:expenseId - Get single expense with splits
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

    // Fetch splits for this single expense
    const splitsResult = await db.query(
      `SELECT es.id, es.expense_id, es.user_id, es.amount_owed, es.amount_owed_base,
              u.name AS user_name, u.email AS user_email
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id = $1
       ORDER BY es.id ASC`,
      [expenseId]
    );

    const splits = splitsResult.rows.map((s) => ({
      id: s.id,
      user_id: s.user_id,
      user_name: s.user_name,
      user_email: s.user_email,
      amount_owed: parseFloat(s.amount_owed),
      amount_owed_base: parseFloat(s.amount_owed_base),
    }));

    let splitType = 'none';
    if (splits.length > 0) {
      const firstAmt = splits[0].amount_owed;
      const allEqual = splits.every((s) => Math.abs(s.amount_owed - firstAmt) <= 0.02);
      splitType = allEqual ? 'equal' : 'custom';
    }

    return res.json({
      success: true,
      data: {
        ...exp,
        amount: parseFloat(exp.amount),
        amount_base: parseFloat(exp.amount_base),
        rate_used: parseFloat(exp.rate_used),
        split_type: splitType,
        splits,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trips/:id/expenses/:expenseId - Update expense and splits
async function updateExpense(req, res, next) {
  const client = await db.getClient();
  try {
    const tripId = parseInt(req.params.id, 10);
    const expenseId = parseInt(req.params.expenseId, 10);

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const existingResult = await client.query(
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

    const { category, amount, currency, date, note, paid_by, split_type, splits, split_members } = req.body;

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

    let targetPayerId = existingExpense.paid_by;
    if (paid_by !== undefined) {
      const parsedPayer = parseInt(paid_by, 10);
      const payerCheck = await client.query(
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
      targetPayerId = parsedPayer;
      updateFields.push(`paid_by = $${pIdx++}`);
      updateValues.push(parsedPayer);
    }

    let finalAmount = parseFloat(existingExpense.amount);
    let finalBase = parseFloat(existingExpense.amount_base);

    // If amount or currency changed, recompute amount_base and rate_used
    if (amount !== undefined || currency !== undefined) {
      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(existingExpense.amount);
      const newCurrency = currency !== undefined ? currency.trim().toUpperCase() : existingExpense.currency;

      if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).json({ success: false, error: { message: 'Amount must be greater than 0.' } });
      }

      const conversion = await convertToBase(newAmount, newCurrency);
      finalAmount = conversion.amount;
      finalBase = conversion.amount_base;

      updateFields.push(`amount = $${pIdx++}`);
      updateValues.push(conversion.amount);

      updateFields.push(`currency = $${pIdx++}`);
      updateValues.push(conversion.currency);

      updateFields.push(`amount_base = $${pIdx++}`);
      updateValues.push(conversion.amount_base);

      updateFields.push(`rate_used = $${pIdx++}`);
      updateValues.push(conversion.rate_used);
    }

    await client.query('BEGIN');

    let updated = existingExpense;
    if (updateFields.length > 0) {
      updateValues.push(expenseId, tripId);
      const updateQuery = `
        UPDATE expenses
        SET ${updateFields.join(', ')}
        WHERE id = $${pIdx++} AND trip_id = $${pIdx++}
        RETURNING *
      `;
      const updatedResult = await client.query(updateQuery, updateValues);
      updated = updatedResult.rows[0];
    }

    // Check if splits need updating
    const existingSplitsRes = await client.query(
      `SELECT * FROM expense_splits WHERE expense_id = $1`,
      [expenseId]
    );

    const hasNewSplitsConfig = split_type !== undefined || splits !== undefined || split_members !== undefined;
    const amountChanged = amount !== undefined || currency !== undefined;

    let finalSplits = [];
    let finalSplitType = 'none';

    if (hasNewSplitsConfig) {
      // Re-resolve splits using new config
      const effectiveSplitType = split_type !== undefined ? split_type : (splits ? 'custom' : 'equal');
      const splitResult = await resolveSplits({
        client,
        tripId,
        totalAmount: finalAmount,
        amountBase: finalBase,
        splitType: effectiveSplitType,
        splits,
        splitMembers: split_members,
        payerId: targetPayerId,
      });

      await client.query(`DELETE FROM expense_splits WHERE expense_id = $1`, [expenseId]);

      for (const s of splitResult.splits) {
        const splitInsert = await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed, amount_owed_base)
           VALUES ($1, $2, $3, $4)
           RETURNING id, expense_id, user_id, amount_owed, amount_owed_base`,
          [expenseId, s.user_id, s.amount_owed, s.amount_owed_base]
        );
        finalSplits.push({
          ...splitInsert.rows[0],
          amount_owed: parseFloat(splitInsert.rows[0].amount_owed),
          amount_owed_base: parseFloat(splitInsert.rows[0].amount_owed_base),
          user_name: s.user_name,
          user_email: s.user_email,
        });
      }
      finalSplitType = splitResult.split_type;
    } else if (amountChanged && existingSplitsRes.rows.length > 0) {
      // Re-scale existing splits with new amount and base
      const currentParticipants = existingSplitsRes.rows.map((r) => r.user_id);
      const splitResult = await resolveSplits({
        client,
        tripId,
        totalAmount: finalAmount,
        amountBase: finalBase,
        splitType: 'equal',
        splitMembers: currentParticipants,
        payerId: targetPayerId,
      });

      await client.query(`DELETE FROM expense_splits WHERE expense_id = $1`, [expenseId]);

      for (const s of splitResult.splits) {
        const splitInsert = await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed, amount_owed_base)
           VALUES ($1, $2, $3, $4)
           RETURNING id, expense_id, user_id, amount_owed, amount_owed_base`,
          [expenseId, s.user_id, s.amount_owed, s.amount_owed_base]
        );
        finalSplits.push({
          ...splitInsert.rows[0],
          amount_owed: parseFloat(splitInsert.rows[0].amount_owed),
          amount_owed_base: parseFloat(splitInsert.rows[0].amount_owed_base),
          user_name: s.user_name,
          user_email: s.user_email,
        });
      }
      finalSplitType = 'equal';
    } else {
      // Keep existing splits
      finalSplits = existingSplitsRes.rows.map((s) => ({
        ...s,
        amount_owed: parseFloat(s.amount_owed),
        amount_owed_base: parseFloat(s.amount_owed_base),
      }));
      finalSplitType = finalSplits.length > 0 ? 'equal' : 'none';
    }

    await client.query('COMMIT');

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
        split_type: finalSplitType,
        splits: finalSplits,
      },
      message: 'Expense updated successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) {
      return res.status(err.status).json({ success: false, error: { message: err.message } });
    }
    next(err);
  } finally {
    client.release();
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
