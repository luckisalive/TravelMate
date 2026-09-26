const db = require('../config/db');
const NotificationService = require('../services/notificationService');

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
 * Greedy Debt Simplification Algorithm (Min-Cash-Flow) - ADR-008
 * Computes minimal peer-to-peer transfers to resolve all outstanding balances.
 * 
 * @param {Array<{ user_id: number, name: string, email: string, net_balance: number }>} netBalances
 * @returns {Array<{ from_user: number, from_name: string, from_email: string, to_user: number, to_name: string, to_email: string, amount: number }>}
 */
function simplifyDebts(netBalances) {
  const debtors = [];   // net_balance < 0 (owes money)
  const creditors = []; // net_balance > 0 (is owed money)

  for (const mb of netBalances) {
    // Work with integer cents to prevent floating point inaccuracies
    const cents = Math.round((parseFloat(mb.net_balance) || 0) * 100);
    if (cents < 0) {
      debtors.push({
        user_id: mb.user_id,
        name: mb.name,
        email: mb.email,
        cents: -cents, // store as positive amount owed
      });
    } else if (cents > 0) {
      creditors.push({
        user_id: mb.user_id,
        name: mb.name,
        email: mb.email,
        cents: cents,  // positive amount to receive
      });
    }
  }

  // Sort descending by amount to greedily pair largest debtors with largest creditors
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const transfers = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settleCents = Math.min(debtor.cents, creditor.cents);
    if (settleCents > 0) {
      transfers.push({
        from_user: debtor.user_id,
        from_name: debtor.name,
        from_email: debtor.email,
        to_user: creditor.user_id,
        to_name: creditor.name,
        to_email: creditor.email,
        amount: parseFloat((settleCents / 100).toFixed(2)),
      });

      debtor.cents -= settleCents;
      creditor.cents -= settleCents;
    }

    if (debtor.cents === 0) d++;
    if (creditor.cents === 0) c++;
  }

  return transfers;
}

/**
 * GET /api/trips/:id/balances
 * Fetches net balance per trip member and computes simplified settlement transfers.
 */
async function getTripBalances(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    // Query all distinct trip members (creator + companions)
    // Aggregates:
    // 1. total_paid_base: sum of expenses paid by member that have splits
    // 2. total_owed_base: sum of splits owed by member
    // 3. total_settled_sent: sum of settlements paid by member
    // 4. total_settled_received: sum of settlements received by member
    const balanceQuery = `
      WITH member_list AS (
        SELECT DISTINCT u.id AS user_id, u.name, u.email
        FROM users u
        LEFT JOIN trip_members tm ON u.id = tm.user_id AND tm.trip_id = $1
        JOIN trips t ON t.id = $1
        WHERE u.id = t.created_by OR tm.trip_id = $1
      ),
      paid_agg AS (
        SELECT e.paid_by AS user_id, COALESCE(SUM(e.amount_base), 0) AS total_paid_base
        FROM expenses e
        WHERE e.trip_id = $1 AND EXISTS (SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id)
        GROUP BY e.paid_by
      ),
      owed_agg AS (
        SELECT es.user_id,
               COALESCE(SUM(
                 CASE 
                   WHEN es.amount_owed_base IS NOT NULL AND es.amount_owed_base > 0 THEN es.amount_owed_base
                   ELSE ROUND((es.amount_owed / NULLIF(e.amount, 0)) * e.amount_base, 2)
                 END
               ), 0) AS total_owed_base
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.trip_id = $1
        GROUP BY es.user_id
      ),
      settled_sent_agg AS (
        SELECT from_user AS user_id, COALESCE(SUM(amount), 0) AS total_settled_sent
        FROM settlements
        WHERE trip_id = $1
        GROUP BY from_user
      ),
      settled_recv_agg AS (
        SELECT to_user AS user_id, COALESCE(SUM(amount), 0) AS total_settled_received
        FROM settlements
        WHERE trip_id = $1
        GROUP BY to_user
      )
      SELECT m.user_id, m.name, m.email,
             COALESCE(p.total_paid_base, 0) AS total_paid_base,
             COALESCE(o.total_owed_base, 0) AS total_owed_base,
             COALESCE(ss.total_settled_sent, 0) AS total_settled_sent,
             COALESCE(sr.total_settled_received, 0) AS total_settled_received,
             ROUND(
               (COALESCE(p.total_paid_base, 0) - COALESCE(o.total_owed_base, 0) 
                + COALESCE(ss.total_settled_sent, 0) - COALESCE(sr.total_settled_received, 0)),
               2
             ) AS net_balance
      FROM member_list m
      LEFT JOIN paid_agg p ON m.user_id = p.user_id
      LEFT JOIN owed_agg o ON m.user_id = o.user_id
      LEFT JOIN settled_sent_agg ss ON m.user_id = ss.user_id
      LEFT JOIN settled_recv_agg sr ON m.user_id = sr.user_id
      ORDER BY m.name ASC;
    `;

    const balanceResult = await db.query(balanceQuery, [tripId]);

    const members = balanceResult.rows.map((row) => {
      const net = parseFloat(row.net_balance);
      return {
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        total_paid_base: parseFloat(row.total_paid_base),
        total_owed_base: parseFloat(row.total_owed_base),
        total_settled_sent: parseFloat(row.total_settled_sent),
        total_settled_received: parseFloat(row.total_settled_received),
        net_balance: Math.abs(net) < 0.005 ? 0 : net,
      };
    });

    // Compute greedy min-cash-flow simplified debt settlements
    const suggestedSettlements = simplifyDebts(members);

    // Fetch recorded settlement history
    const settlementsResult = await db.query(
      `SELECT s.id, s.trip_id, s.from_user, s.to_user, s.amount, s.settled_at,
              uf.name AS from_name, uf.email AS from_email,
              ut.name AS to_name, ut.email AS to_email
       FROM settlements s
       JOIN users uf ON s.from_user = uf.id
       JOIN users ut ON s.to_user = ut.id
       WHERE s.trip_id = $1
       ORDER BY s.settled_at DESC`,
      [tripId]
    );

    const settlementHistory = settlementsResult.rows.map((s) => ({
      id: s.id,
      trip_id: s.trip_id,
      from_user: s.from_user,
      from_name: s.from_name,
      from_email: s.from_email,
      to_user: s.to_user,
      to_name: s.to_name,
      to_email: s.to_email,
      amount: parseFloat(s.amount),
      settled_at: s.settled_at,
    }));

    // Find current requesting user's balance
    const currentUserBalance = members.find((m) => m.user_id === req.user.id) || null;
    const isSettledUp = members.every((m) => Math.abs(m.net_balance) < 0.01);

    return res.json({
      success: true,
      data: {
        trip_id: trip.id,
        trip_name: trip.name,
        base_currency: trip.base_currency,
        members,
        current_user_balance: currentUserBalance,
        suggested_settlements: suggestedSettlements,
        settlements: settlementHistory,
        is_settled_up: isSettledUp,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/settlements (or POST /api/trips/:id/settlements)
 * Records a peer-to-peer settlement payment between trip members.
 */
async function recordSettlement(req, res, next) {
  try {
    const tripId = parseInt(req.params.id || req.body.trip_id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or missing trip ID.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const { from_user, to_user, amount } = req.body;
    const fromUserId = parseInt(from_user, 10);
    const toUserId = parseInt(to_user, 10);
    const parsedAmount = parseFloat(amount);

    if (isNaN(fromUserId) || isNaN(toUserId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Both from_user and to_user must be specified with valid user IDs.' },
      });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'from_user and to_user cannot be the same person.' },
      });
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Settlement amount must be a positive number greater than 0.' },
      });
    }

    // Verify both users are members of the trip
    const memberCheck = await db.query(
      `SELECT id, name, email FROM users
       WHERE id IN ($1, $2)
         AND (id = $3 OR id IN (SELECT user_id FROM trip_members WHERE trip_id = $4))`,
      [fromUserId, toUserId, trip.created_by, tripId]
    );

    if (memberCheck.rows.length !== 2) {
      return res.status(400).json({
        success: false,
        error: { message: 'Both the payer and recipient must be active members of this trip.' },
      });
    }

    const fromUserInfo = memberCheck.rows.find((u) => u.id === fromUserId);
    const toUserInfo = memberCheck.rows.find((u) => u.id === toUserId);

    // Insert settlement record
    const insertResult = await db.query(
      `INSERT INTO settlements (trip_id, from_user, to_user, amount, settled_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [tripId, fromUserId, toUserId, parseFloat(parsedAmount.toFixed(2))]
    );

    const settlement = insertResult.rows[0];

    // Send notifications to debtor and creditor
    await NotificationService.createNotification({
      userId: toUserId,
      type: 'settlement',
      message: `${fromUserInfo.name} recorded a settlement of ₹${parsedAmount.toFixed(2)} to you for trip "${trip.name}".`,
    });
    await NotificationService.createNotification({
      userId: fromUserId,
      type: 'settlement',
      message: `You recorded a settlement payment of ₹${parsedAmount.toFixed(2)} to ${toUserInfo.name} for trip "${trip.name}".`,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: settlement.id,
        trip_id: settlement.trip_id,
        from_user: settlement.from_user,
        from_name: fromUserInfo.name,
        from_email: fromUserInfo.email,
        to_user: settlement.to_user,
        to_name: toUserInfo.name,
        to_email: toUserInfo.email,
        amount: parseFloat(settlement.amount),
        settled_at: settlement.settled_at,
      },
      message: `Settlement of ${parsedAmount} recorded from ${fromUserInfo.name} to ${toUserInfo.name}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/settlements (or GET /api/trips/:id/settlements)
 * Returns settlement history for a trip.
 */
async function getTripSettlements(req, res, next) {
  try {
    const tripId = parseInt(req.params.id || req.query.trip_id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or missing trip ID.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const result = await db.query(
      `SELECT s.id, s.trip_id, s.from_user, s.to_user, s.amount, s.settled_at,
              uf.name AS from_name, uf.email AS from_email,
              ut.name AS to_name, ut.email AS to_email
       FROM settlements s
       JOIN users uf ON s.from_user = uf.id
       JOIN users ut ON s.to_user = ut.id
       WHERE s.trip_id = $1
       ORDER BY s.settled_at DESC`,
      [tripId]
    );

    const settlements = result.rows.map((s) => ({
      id: s.id,
      trip_id: s.trip_id,
      from_user: s.from_user,
      from_name: s.from_name,
      from_email: s.from_email,
      to_user: s.to_user,
      to_name: s.to_name,
      to_email: s.to_email,
      amount: parseFloat(s.amount),
      settled_at: s.settled_at,
    }));

    return res.json({
      success: true,
      data: settlements,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/settlements/:id (or DELETE /api/trips/:id/settlements/:settlementId)
 * Reverts/deletes an existing settlement entry.
 */
async function deleteSettlement(req, res, next) {
  try {
    const settlementId = parseInt(req.params.settlementId || req.params.id, 10);
    if (isNaN(settlementId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid settlement ID format.' } });
    }

    // Fetch settlement
    const settResult = await db.query(`SELECT * FROM settlements WHERE id = $1`, [settlementId]);
    if (settResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Settlement record not found.' } });
    }

    const settlement = settResult.rows[0];

    // Verify trip membership and permissions (payer, receiver, or trip owner)
    const trip = await verifyTripMembership(req.user.id, settlement.trip_id);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const isAuthorized =
      req.user.id === settlement.from_user ||
      req.user.id === settlement.to_user ||
      req.user.id === trip.created_by ||
      trip.role === 'owner';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the participants or trip owner can delete this settlement.' },
      });
    }

    await db.query(`DELETE FROM settlements WHERE id = $1`, [settlementId]);

    return res.json({
      success: true,
      message: 'Settlement record deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  simplifyDebts,
  getTripBalances,
  recordSettlement,
  getTripSettlements,
  deleteSettlement,
};
