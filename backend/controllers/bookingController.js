const db = require('../config/db');
const { getExchangeRate } = require('../utils/currency');

// Helper to resolve exchange rate from cached currency utility
async function getExchangeRateForCurrency(currency) {
  return getExchangeRate(currency);
}

// POST /api/bookings/hotel - Book a hotel room
async function createHotelBooking(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      hotel_id,
      trip_id,
      new_trip_name,
      check_in,
      check_out,
      rooms = 1,
      guests = 2,
      currency,
    } = req.body;

    // Validate required fields
    if (!hotel_id || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error: { message: 'Hotel ID, check-in date, and check-out date are required.' },
      });
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid check-in or check-out date format.' },
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Check-out date must be strictly after check-in date.' },
      });
    }

    const numRooms = Math.max(1, Math.min(10, parseInt(rooms, 10) || 1));
    const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

    // Fetch hotel
    const hotelResult = await client.query(
      `SELECT id, name, city, stars, price_per_night, rating, image_url 
       FROM hotels 
       WHERE id = $1`,
      [hotel_id]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Hotel not found.' },
      });
    }

    const hotel = hotelResult.rows[0];
    const pricePerNight = parseFloat(hotel.price_per_night);
    const amountBase = parseFloat((pricePerNight * nights * numRooms).toFixed(2));

    // Resolve target currency & rate
    const targetCurrency = (currency || req.user.display_currency || 'INR').toUpperCase();
    const rateUsed = await getExchangeRateForCurrency(targetCurrency);
    const amount = parseFloat((amountBase * rateUsed).toFixed(2));

    await client.query('BEGIN');

    // Resolve or create trip
    let resolvedTripId = trip_id ? parseInt(trip_id, 10) : null;

    if (resolvedTripId) {
      // Verify trip belongs to user
      const tripCheck = await client.query(
        `SELECT id FROM trips t
         LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
         WHERE t.id = $2 AND (t.created_by = $1 OR tm.user_id = $1)`,
        [req.user.id, resolvedTripId]
      );

      if (tripCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: { message: 'Trip not found or unauthorized.' },
        });
      }
    } else {
      // Check if user specified a new trip name or auto-generate one
      const tripName = (new_trip_name && new_trip_name.trim()) 
        ? new_trip_name.trim() 
        : `Trip to ${hotel.city} (${check_in})`;

      const newTripRes = await client.query(
        `INSERT INTO trips (name, created_by, start_date, end_date, budget, base_currency)
         VALUES ($1, $2, $3, $4, $5, 'INR')
         RETURNING id, name`,
        [tripName, req.user.id, check_in, check_out, 0.0]
      );

      resolvedTripId = newTripRes.rows[0].id;

      await client.query(
        `INSERT INTO trip_members (trip_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (trip_id, user_id) DO NOTHING`,
        [resolvedTripId, req.user.id]
      );
    }

    // Insert booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (
         user_id, trip_id, hotel_id, check_in, check_out, 
         status, amount, currency, amount_base, rate_used
       ) VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        resolvedTripId,
        hotel.id,
        check_in,
        check_out,
        amount,
        targetCurrency,
        amountBase,
        rateUsed,
      ]
    );

    const booking = bookingResult.rows[0];

    // Create in-app notification
    await client.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'booking', $2)`,
      [
        req.user.id,
        `Reservation confirmed at ${hotel.name}, ${hotel.city} for ${nights} night(s).`,
      ]
    );

    // Auto-link to itinerary
    await client.query(
      `INSERT INTO itinerary_items (trip_id, day_number, position, time, title, notes, booking_id)
       VALUES ($1, 1, 0, '14:00', $2, $3, $4)`,
      [
        resolvedTripId,
        `Check-in: ${hotel.name}`,
        `Hotel stay reserved (${nights} night(s), ${numRooms} room(s))`,
        booking.id,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          reference_code: `TM-HTL-${booking.id.toString().padStart(6, '0')}`,
          status: booking.status,
          check_in: booking.check_in,
          check_out: booking.check_out,
          nights,
          rooms: numRooms,
          guests: parseInt(guests, 10) || 2,
          amount: parseFloat(booking.amount),
          currency: booking.currency,
          amount_base: parseFloat(booking.amount_base),
          rate_used: parseFloat(booking.rate_used),
          created_at: booking.created_at,
        },
        hotel: {
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          stars: parseFloat(hotel.stars),
          rating: parseFloat(hotel.rating),
          image_url: hotel.image_url,
          price_per_night: pricePerNight,
        },
        trip_id: resolvedTripId,
      },
      message: 'Hotel booking confirmed successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// POST /api/bookings/transport - Concurrency-safe Transport Booking (Flight, Train, Bus)
async function createTransportBooking(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      transport_id,
      seat_no,
      trip_id,
      new_trip_name,
      passenger_name,
      currency,
    } = req.body;

    if (!transport_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transport ID is required.' },
      });
    }

    await client.query('BEGIN');

    // 1. Fetch transport option with row-level lock
    const transportResult = await client.query(
      `SELECT t.*,
              s_orig.name AS origin_name, s_orig.city AS origin_city,
              s_dest.name AS dest_name, s_dest.city AS dest_city
       FROM transport_options t
       JOIN stations s_orig ON t.origin_code = s_orig.code
       JOIN stations s_dest ON t.destination_code = s_dest.code
       WHERE t.id = $1
       FOR UPDATE OF t`,
      [transport_id]
    );

    if (transportResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Transport option not found.' },
      });
    }

    const transport = transportResult.rows[0];

    // 2. Validate seat selection for flights (PRD Section 11 & ADR-005)
    let selectedSeatNo = seat_no ? seat_no.trim().toUpperCase() : null;

    if (transport.mode === 'flight') {
      if (!selectedSeatNo) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: { message: 'Flight booking requires a selected seat number (e.g. 14B).' },
        });
      }

      // Check if seat exists and is currently available with lock
      const seatCheck = await client.query(
        `SELECT id, booking_id FROM seats 
         WHERE transport_id = $1 AND seat_no = $2 
         FOR UPDATE`,
        [transport.id, selectedSeatNo]
      );

      if (seatCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: { message: `Seat ${selectedSeatNo} does not exist on this flight.` },
        });
      }

      if (seatCheck.rows[0].booking_id !== null) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: { message: `Seat ${selectedSeatNo} is already booked. Please choose another seat.` },
        });
      }
    }

    // 3. Resolve or create trip
    let resolvedTripId = trip_id ? parseInt(trip_id, 10) : null;
    const departsDate = new Date(transport.departs_at).toISOString().split('T')[0];
    const arrivesDate = new Date(transport.arrives_at).toISOString().split('T')[0];

    if (resolvedTripId) {
      const tripCheck = await client.query(
        `SELECT id FROM trips t
         LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
         WHERE t.id = $2 AND (t.created_by = $1 OR tm.user_id = $1)`,
        [req.user.id, resolvedTripId]
      );

      if (tripCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: { message: 'Trip not found or unauthorized.' },
        });
      }
    } else {
      const tripName = (new_trip_name && new_trip_name.trim())
        ? new_trip_name.trim()
        : `Trip to ${transport.dest_city || transport.destination_code} (${departsDate})`;

      const newTripRes = await client.query(
        `INSERT INTO trips (name, created_by, start_date, end_date, budget, base_currency)
         VALUES ($1, $2, $3, $4, $5, 'INR')
         RETURNING id, name`,
        [tripName, req.user.id, departsDate, arrivesDate, 0.0]
      );

      resolvedTripId = newTripRes.rows[0].id;

      await client.query(
        `INSERT INTO trip_members (trip_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (trip_id, user_id) DO NOTHING`,
        [resolvedTripId, req.user.id]
      );
    }

    // 4. Calculate prices with immutable currency conversion
    const amountBase = parseFloat(transport.price);
    const targetCurrency = (currency || req.user.display_currency || 'INR').toUpperCase();
    const rateUsed = await getExchangeRateForCurrency(targetCurrency);
    const amount = parseFloat((amountBase * rateUsed).toFixed(2));

    // 5. Insert booking into `bookings` table
    const bookingResult = await client.query(
      `INSERT INTO bookings (
         user_id, trip_id, transport_id, check_in, check_out,
         status, amount, currency, amount_base, rate_used
       ) VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        resolvedTripId,
        transport.id,
        departsDate,
        arrivesDate,
        amount,
        targetCurrency,
        amountBase,
        rateUsed,
      ]
    );

    const booking = bookingResult.rows[0];

    // 6. Concurrency-Safe Atomic Seat Assignment (ADR-005)
    if (selectedSeatNo) {
      const seatUpdate = await client.query(
        `UPDATE seats 
         SET booking_id = $1 
         WHERE transport_id = $2 AND seat_no = $3 AND booking_id IS NULL
         RETURNING id, seat_no`,
        [booking.id, transport.id, selectedSeatNo]
      );

      if (seatUpdate.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: { message: `Seat ${selectedSeatNo} was just reserved by another traveler. Please select a different seat.` },
        });
      }
    }

    // 7. Create in-app notification
    const passName = (passenger_name && passenger_name.trim()) || req.user.name;
    const seatInfo = selectedSeatNo ? `Seat ${selectedSeatNo}` : 'Ticket Confirmed';
    await client.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'booking', $2)`,
      [
        req.user.id,
        `Transport booking confirmed: ${transport.operator} ${transport.number} (${transport.origin_city} → ${transport.dest_city}) for ${passName}. ${seatInfo}.`,
      ]
    );

    // 8. Auto-link to itinerary
    const departsTime = new Date(transport.departs_at).toISOString().split('T')[1].substring(0, 5);
    await client.query(
      `INSERT INTO itinerary_items (trip_id, day_number, position, time, title, notes, booking_id)
       VALUES ($1, 1, 0, $2, $3, $4, $5)`,
      [
        resolvedTripId,
        departsTime,
        `Departure: ${transport.operator} ${transport.number}`,
        `${transport.mode.toUpperCase()} from ${transport.origin_city} (${transport.origin_code}) to ${transport.dest_city} (${transport.destination_code}) - ${seatInfo}`,
        booking.id,
      ]
    );

    await client.query('COMMIT');

    const refCode = `TM-TRP-${booking.id.toString().padStart(6, '0')}`;

    return res.status(201).json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          reference_code: refCode,
          status: booking.status,
          departs_at: transport.departs_at,
          arrives_at: transport.arrives_at,
          passenger_name: passName,
          seat_no: selectedSeatNo || 'Standard / Unreserved',
          amount: parseFloat(booking.amount),
          currency: booking.currency,
          amount_base: parseFloat(booking.amount_base),
          rate_used: parseFloat(booking.rate_used),
          created_at: booking.created_at,
        },
        transport: {
          id: transport.id,
          mode: transport.mode,
          operator: transport.operator,
          number: transport.number,
          class: transport.class,
          price: parseFloat(transport.price),
          departs_at: transport.departs_at,
          arrives_at: transport.arrives_at,
          origin: {
            code: transport.origin_code,
            name: transport.origin_name,
            city: transport.origin_city,
          },
          destination: {
            code: transport.destination_code,
            name: transport.dest_name,
            city: transport.dest_city,
          },
        },
        trip_id: resolvedTripId,
      },
      message: 'Transport booking confirmed successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/bookings - List all bookings for current user
async function getMyBookings(req, res, next) {
  try {
    const { type, status, trip_id, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['b.user_id = $1'];
    const values = [req.user.id];

    if (type === 'hotel') {
      conditions.push('b.hotel_id IS NOT NULL');
    } else if (type === 'transport') {
      conditions.push('b.transport_id IS NOT NULL');
    }

    if (status && ['confirmed', 'cancelled', 'completed'].includes(status.toLowerCase())) {
      values.push(status.toLowerCase());
      conditions.push(`b.status = $${values.length}`);
    }

    if (trip_id && !isNaN(parseInt(trip_id, 10))) {
      values.push(parseInt(trip_id, 10));
      conditions.push(`b.trip_id = $${values.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Total Count
    const countRes = await db.query(
      `SELECT COUNT(*) AS total FROM bookings b WHERE ${whereClause}`,
      values
    );
    const totalCount = parseInt(countRes.rows[0]?.total || 0, 10);

    const pagedValues = [...values, limitNum, offset];

    const result = await db.query(
      `SELECT b.*,
              h.name AS hotel_name, h.city AS hotel_city, h.stars AS hotel_stars,
              h.rating AS hotel_rating, h.image_url AS hotel_image_url,
              h.price_per_night AS hotel_price_per_night,
              tr.mode AS transport_mode, tr.operator AS transport_operator,
              tr.number AS transport_number, tr.class AS transport_class,
              tr.price AS transport_price, tr.departs_at AS transport_departs_at,
              tr.arrives_at AS transport_arrives_at,
              s_orig.code AS origin_code, s_orig.name AS origin_name, s_orig.city AS origin_city,
              s_dest.code AS dest_code, s_dest.name AS dest_name, s_dest.city AS dest_city,
              s.seat_no AS seat_no,
              t.name AS trip_name
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN stations s_orig ON tr.origin_code = s_orig.code
       LEFT JOIN stations s_dest ON tr.destination_code = s_dest.code
       LEFT JOIN seats s ON s.booking_id = b.id
       LEFT JOIN trips t ON b.trip_id = t.id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${pagedValues.length - 1} OFFSET $${pagedValues.length}`,
      pagedValues
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        reference_code: row.hotel_id 
          ? `TM-HTL-${row.id.toString().padStart(6, '0')}`
          : `TM-TRP-${row.id.toString().padStart(6, '0')}`,
        type: row.hotel_id ? 'hotel' : 'transport',
        trip_id: row.trip_id,
        trip_name: row.trip_name,
        check_in: row.check_in,
        check_out: row.check_out,
        status: row.status,
        amount: parseFloat(row.amount),
        currency: row.currency,
        amount_base: parseFloat(row.amount_base),
        rate_used: parseFloat(row.rate_used),
        created_at: row.created_at,
        hotel: row.hotel_id
          ? {
              id: row.hotel_id,
              name: row.hotel_name,
              city: row.hotel_city,
              stars: parseFloat(row.hotel_stars),
              rating: parseFloat(row.hotel_rating),
              image_url: row.hotel_image_url,
              price_per_night: parseFloat(row.hotel_price_per_night),
            }
          : null,
        transport: row.transport_id
          ? {
              id: row.transport_id,
              mode: row.transport_mode,
              operator: row.transport_operator,
              number: row.transport_number,
              class: row.transport_class,
              seat_no: row.seat_no || 'Standard',
              departs_at: row.transport_departs_at,
              arrives_at: row.transport_arrives_at,
              origin: {
                code: row.origin_code,
                name: row.origin_name,
                city: row.origin_city,
              },
              destination: {
                code: row.dest_code,
                name: row.dest_name,
                city: row.dest_city,
              },
            }
          : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/:id - Single booking detail with IDOR protection
async function getBookingById(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid booking ID format.' },
      });
    }

    const result = await db.query(
      `SELECT b.*,
              h.name AS hotel_name, h.city AS hotel_city, h.stars AS hotel_stars,
              h.rating AS hotel_rating, h.image_url AS hotel_image_url,
              h.price_per_night AS hotel_price_per_night,
              tr.mode AS transport_mode, tr.operator AS transport_operator,
              tr.number AS transport_number, tr.class AS transport_class,
              tr.price AS transport_price, tr.departs_at AS transport_departs_at,
              tr.arrives_at AS transport_arrives_at,
              s_orig.code AS origin_code, s_orig.name AS origin_name, s_orig.city AS origin_city,
              s_dest.code AS dest_code, s_dest.name AS dest_name, s_dest.city AS dest_city,
              s.seat_no AS seat_no,
              t.name AS trip_name
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN stations s_orig ON tr.origin_code = s_orig.code
       LEFT JOIN stations s_dest ON tr.destination_code = s_dest.code
       LEFT JOIN seats s ON s.booking_id = b.id
       LEFT JOIN trips t ON b.trip_id = t.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, req.user.id]
    );

    if (result.rows.length === 0) {
      // Return 404 for IDOR security
      return res.status(404).json({
        success: false,
        error: { message: 'Booking not found or unauthorized.' },
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      data: {
        id: row.id,
        reference_code: row.hotel_id 
          ? `TM-HTL-${row.id.toString().padStart(6, '0')}`
          : `TM-TRP-${row.id.toString().padStart(6, '0')}`,
        type: row.hotel_id ? 'hotel' : 'transport',
        trip_id: row.trip_id,
        trip_name: row.trip_name,
        check_in: row.check_in,
        check_out: row.check_out,
        status: row.status,
        amount: parseFloat(row.amount),
        currency: row.currency,
        amount_base: parseFloat(row.amount_base),
        rate_used: parseFloat(row.rate_used),
        created_at: row.created_at,
        hotel: row.hotel_id
          ? {
              id: row.hotel_id,
              name: row.hotel_name,
              city: row.hotel_city,
              stars: parseFloat(row.hotel_stars),
              rating: parseFloat(row.hotel_rating),
              image_url: row.hotel_image_url,
              price_per_night: parseFloat(row.hotel_price_per_night),
            }
          : null,
        transport: row.transport_id
          ? {
              id: row.transport_id,
              mode: row.transport_mode,
              operator: row.transport_operator,
              number: row.transport_number,
              class: row.transport_class,
              seat_no: row.seat_no || 'Standard',
              departs_at: row.transport_departs_at,
              arrives_at: row.transport_arrives_at,
              origin: {
                code: row.origin_code,
                name: row.origin_name,
                city: row.origin_city,
              },
              destination: {
                code: row.dest_code,
                name: row.dest_name,
                city: row.dest_city,
              },
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PATCH & POST /api/bookings/:id/cancel - Cancel booking
async function cancelBooking(req, res, next) {
  const client = await db.getClient();
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid booking ID format.' },
      });
    }

    // IDOR check: booking must belong to user
    const checkResult = await client.query(
      `SELECT b.*, h.name AS hotel_name,
              tr.operator AS transport_operator, tr.number AS transport_number
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Booking not found or unauthorized.' },
      });
    }

    const booking = checkResult.rows[0];

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Booking is already cancelled.' },
      });
    }

    await client.query('BEGIN');

    // 1. Release seat reservation if transport booking
    if (booking.transport_id) {
      await client.query(
        `UPDATE seats 
         SET booking_id = NULL 
         WHERE booking_id = $1`,
        [bookingId]
      );
    }

    // 2. Update booking status
    const updateResult = await client.query(
      `UPDATE bookings 
       SET status = 'cancelled' 
       WHERE id = $1 
       RETURNING *`,
      [bookingId]
    );

    // 3. Create notification
    const entityName = booking.hotel_name || `${booking.transport_operator} ${booking.transport_number}` || 'Reservation';
    await client.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'booking', $2)`,
      [
        req.user.id,
        `Your reservation for ${entityName} has been cancelled.`,
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        id: updateResult.rows[0].id,
        status: updateResult.rows[0].status,
        message: 'Booking cancelled successfully.',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PATCH & POST /api/bookings/:id/complete - Mark booking as completed
async function completeBooking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid booking ID format.' },
      });
    }

    const checkResult = await db.query(
      `SELECT b.*, h.name AS hotel_name, tr.operator, tr.number
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Booking not found or unauthorized.' },
      });
    }

    const booking = checkResult.rows[0];
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot complete a cancelled booking.' },
      });
    }

    const updateResult = await db.query(
      `UPDATE bookings SET status = 'completed' WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    const title = booking.hotel_name || `${booking.operator || 'Transport'} ${booking.number || ''}`.trim();
    await db.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'booking', $2)`,
      [req.user.id, `Your trip/stay at ${title} is completed! You can now leave a review.`]
    );

    return res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Booking marked as completed.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createHotelBooking,
  createTransportBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  completeBooking,
};

