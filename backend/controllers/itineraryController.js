const db = require('../config/db');
const NotificationService = require('../services/notificationService');

// Helper to verify trip membership (IDOR protection per ADR-010)
async function verifyTripMembership(userId, tripId) {
  const result = await db.query(
    `SELECT t.id, t.name, t.start_date, t.end_date, t.created_by, tm.role
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
 * GET /api/trips/:id/itinerary - Fetch day-wise activities and unlinked bookings
 */
async function getTripItinerary(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const startDateStr = typeof trip.start_date === 'string' ? trip.start_date.split('T')[0] : new Date(trip.start_date).toISOString().split('T')[0];
    const endDateStr = typeof trip.end_date === 'string' ? trip.end_date.split('T')[0] : new Date(trip.end_date).toISOString().split('T')[0];
    const diffTime = Math.abs(new Date(endDateStr) - new Date(startDateStr));
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 1. Fetch all itinerary items for this trip
    const itemsResult = await db.query(
      `SELECT i.*, 
              b.hotel_id, b.transport_id, b.status AS booking_status,
              h.name AS hotel_name, h.city AS hotel_city,
              tr.mode AS transport_mode, tr.operator AS transport_operator, tr.number AS transport_number,
              tr.origin_code, tr.destination_code, tr.class AS transport_class,
              s.seat_no
       FROM itinerary_items i
       LEFT JOIN bookings b ON i.booking_id = b.id
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN seats s ON s.booking_id = b.id
       WHERE i.trip_id = $1
       ORDER BY i.day_number ASC, i.position ASC, i.time ASC NULLS LAST, i.id ASC`,
      [tripId]
    );

    // 2. Fetch all confirmed/completed bookings for this trip to identify unlinked ones
    const bookingsResult = await db.query(
      `SELECT b.id, b.hotel_id, b.transport_id, b.check_in, b.check_out, b.status,
              h.name AS hotel_name, h.city AS hotel_city,
              tr.mode AS transport_mode, tr.operator AS transport_operator, tr.number AS transport_number,
              tr.origin_code, tr.destination_code, tr.departs_at, tr.arrives_at, tr.class AS transport_class,
              s.seat_no
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN seats s ON s.booking_id = b.id
       WHERE b.trip_id = $1 AND b.status <> 'cancelled'`,
      [tripId]
    );

    const linkedBookingIds = new Set(
      itemsResult.rows.filter((it) => it.booking_id).map((it) => it.booking_id)
    );

    const unlinkedBookings = bookingsResult.rows
      .filter((b) => !linkedBookingIds.has(b.id))
      .map((b) => ({
        id: b.id,
        type: b.hotel_id ? 'hotel' : 'transport',
        title: b.hotel_id
          ? `Stay: ${b.hotel_name}`
          : `${b.transport_mode.toUpperCase()}: ${b.transport_operator} ${b.transport_number}`,
        check_in: b.check_in,
        check_out: b.check_out,
        departs_at: b.departs_at,
        arrives_at: b.arrives_at,
        seat_no: b.seat_no,
      }));

    return res.json({
      success: true,
      data: {
        trip_id: tripId,
        trip_name: trip.name,
        start_date: startDateStr,
        end_date: endDateStr,
        total_days: totalDays,
        items: itemsResult.rows.map((row) => ({
          id: row.id,
          trip_id: row.trip_id,
          day_number: row.day_number,
          position: row.position,
          time: row.time ? row.time.toString().substring(0, 5) : null,
          title: row.title,
          notes: row.notes,
          booking_id: row.booking_id,
          booking: row.booking_id ? {
            id: row.booking_id,
            status: row.booking_status,
            hotel_id: row.hotel_id,
            transport_id: row.transport_id,
            hotel_name: row.hotel_name,
            hotel_city: row.hotel_city,
            transport_mode: row.transport_mode,
            transport_operator: row.transport_operator,
            transport_number: row.transport_number,
            origin_code: row.origin_code,
            destination_code: row.destination_code,
            class: row.transport_class,
            seat_no: row.seat_no,
          } : null,
        })),
        unlinked_bookings: unlinkedBookings,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:id/itinerary - Create custom itinerary activity
 */
async function createItineraryItem(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const { day_number, time, title, notes, booking_id, position = 0 } = req.body;

    const dayNum = parseInt(day_number, 10);
    if (isNaN(dayNum) || dayNum < 1) {
      return res.status(400).json({
        success: false,
        error: { message: 'Day number must be a positive integer >= 1.' },
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Activity title is required.' },
      });
    }

    // Format time if provided
    let formattedTime = null;
    if (time && time.trim()) {
      formattedTime = time.trim().length === 5 ? `${time.trim()}:00` : time.trim();
    }

    const insertResult = await db.query(
      `INSERT INTO itinerary_items (trip_id, day_number, position, time, title, notes, booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tripId,
        dayNum,
        parseInt(position, 10) || 0,
        formattedTime,
        title.trim(),
        (notes || '').trim(),
        booking_id ? parseInt(booking_id, 10) : null,
      ]
    );

    const item = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        ...item,
        time: item.time ? item.time.toString().substring(0, 5) : null,
      },
      message: 'Itinerary activity added successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/trips/:id/itinerary/:itemId - Update an itinerary item
 */
async function updateItineraryItem(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (isNaN(tripId) || isNaN(itemId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip or item ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const { day_number, time, title, notes, position, booking_id } = req.body;

    const existingRes = await db.query(
      `SELECT * FROM itinerary_items WHERE id = $1 AND trip_id = $2`,
      [itemId, tripId]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Itinerary item not found.' } });
    }

    const current = existingRes.rows[0];
    const newDay = day_number !== undefined ? parseInt(day_number, 10) : current.day_number;
    const newTitle = title !== undefined ? title.trim() : current.title;
    const newPos = position !== undefined ? parseInt(position, 10) : current.position;
    const newNotes = notes !== undefined ? notes.trim() : current.notes;
    const newBookingId = booking_id !== undefined ? (booking_id ? parseInt(booking_id, 10) : null) : current.booking_id;

    let newTime = current.time;
    if (time !== undefined) {
      newTime = time && time.trim() ? (time.trim().length === 5 ? `${time.trim()}:00` : time.trim()) : null;
    }

    const updateRes = await db.query(
      `UPDATE itinerary_items
       SET day_number = $1, time = $2, title = $3, notes = $4, position = $5, booking_id = $6
       WHERE id = $7 AND trip_id = $8
       RETURNING *`,
      [newDay, newTime, newTitle, newNotes, newPos, newBookingId, itemId, tripId]
    );

    return res.json({
      success: true,
      data: {
        ...updateRes.rows[0],
        time: updateRes.rows[0].time ? updateRes.rows[0].time.toString().substring(0, 5) : null,
      },
      message: 'Itinerary item updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/trips/:id/itinerary/:itemId - Delete an itinerary item
 */
async function deleteItineraryItem(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (isNaN(tripId) || isNaN(itemId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid trip or item ID format.' } });
    }

    const trip = await verifyTripMembership(req.user.id, tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or unauthorized.' } });
    }

    const result = await db.query(
      `DELETE FROM itinerary_items WHERE id = $1 AND trip_id = $2 RETURNING id`,
      [itemId, tripId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Itinerary item not found.' } });
    }

    return res.json({
      success: true,
      data: { id: itemId },
      message: 'Itinerary item deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/trips/:id/itinerary/sync-bookings - Auto-link transport and hotel bookings into itinerary
 */
async function syncBookingsToItinerary(req, res, next) {
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

    const tripStartMs = new Date(trip.start_date).getTime();

    // Fetch all confirmed/completed bookings for this trip
    const bookingsResult = await client.query(
      `SELECT b.*, 
              h.name AS hotel_name, h.city AS hotel_city,
              tr.mode AS transport_mode, tr.operator AS transport_operator, tr.number AS transport_number,
              tr.origin_code, tr.destination_code, tr.departs_at, tr.arrives_at, tr.class AS transport_class,
              s.seat_no
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN seats s ON s.booking_id = b.id
       WHERE b.trip_id = $1 AND b.status <> 'cancelled'`,
      [tripId]
    );

    // Fetch already linked booking IDs
    const linkedResult = await client.query(
      `SELECT DISTINCT booking_id FROM itinerary_items WHERE trip_id = $1 AND booking_id IS NOT NULL`,
      [tripId]
    );
    const alreadyLinkedIds = new Set(linkedResult.rows.map((r) => r.booking_id));

    let createdCount = 0;
    await client.query('BEGIN');

    for (const b of bookingsResult.rows) {
      if (alreadyLinkedIds.has(b.id)) {
        continue;
      }

      if (b.hotel_id) {
        // Hotel Check-in
        const checkInMs = new Date(b.check_in).getTime();
        const checkInDay = Math.max(1, Math.floor((checkInMs - tripStartMs) / 86400000) + 1);

        await client.query(
          `INSERT INTO itinerary_items (trip_id, day_number, position, time, title, notes, booking_id)
           VALUES ($1, $2, 0, '14:00:00', $3, $4, $5)`,
          [
            tripId,
            checkInDay,
            `Check-in: ${b.hotel_name}`,
            `${b.hotel_city} — Hotel Check-in (Voucher: TM-HTL-${b.id.toString().padStart(6, '0')})`,
            b.id,
          ]
        );
        createdCount++;

        // Hotel Check-out
        if (b.check_out) {
          const checkOutMs = new Date(b.check_out).getTime();
          const checkOutDay = Math.max(1, Math.floor((checkOutMs - tripStartMs) / 86400000) + 1);

          await client.query(
            `INSERT INTO itinerary_items (trip_id, day_number, position, time, title, notes, booking_id)
             VALUES ($1, $2, 10, '11:00:00', $3, $4, $5)`,
            [
              tripId,
              checkOutDay,
              `Check-out: ${b.hotel_name}`,
              `Departing ${b.hotel_name}, ${b.hotel_city}`,
              b.id,
            ]
          );
          createdCount++;
        }
      } else if (b.transport_id) {
        // Transport Departure
        const depDate = new Date(b.departs_at);
        const depDay = Math.max(1, Math.floor((depDate.getTime() - tripStartMs) / 86400000) + 1);
        const depTime = depDate.toISOString().substring(11, 16) + ':00';
        const arrTime = b.arrives_at ? new Date(b.arrives_at).toISOString().substring(11, 16) : '';

        await client.query(
          `INSERT INTO itinerary_items (trip_id, day_number, position, time, title, notes, booking_id)
           VALUES ($1, $2, 0, $3, $4, $5, $6)`,
          [
            tripId,
            depDay,
            depTime,
            `${b.transport_mode.toUpperCase()}: ${b.transport_operator} ${b.transport_number} (${b.origin_code} → ${b.destination_code})`,
            `Class: ${b.transport_class} | Seat: ${b.seat_no || 'Standard'}${arrTime ? ` | Arrives: ${arrTime}` : ''} (Ticket: TM-TRP-${b.id.toString().padStart(6, '0')})`,
            b.id,
          ]
        );
        createdCount++;
      }
    }

    await client.query('COMMIT');

    if (createdCount > 0) {
      await NotificationService.createNotification({
        userId: req.user.id,
        type: 'itinerary',
        message: `Auto-linked ${createdCount} booking activities into your trip "${trip.name}" itinerary.`,
      });
    }

    return res.json({
      success: true,
      synced_count: createdCount,
      message: `Successfully auto-linked ${createdCount} booking activities into the itinerary.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/trips/:id/itinerary/reorder - Reorder activities within or across days
 */
async function reorderItineraryItems(req, res, next) {
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

    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Items array with { id, day_number, position } is required.' },
      });
    }

    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        `UPDATE itinerary_items
         SET day_number = $1, position = $2
         WHERE id = $3 AND trip_id = $4`,
        [item.day_number, item.position || 0, item.id, tripId]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Itinerary reordered successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getTripItinerary,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  syncBookingsToItinerary,
  reorderItineraryItems,
};
