const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Helper to resolve exchange rate from DB or fallback
async function getExchangeRateForCurrency(currency) {
  const currUpper = (currency || 'INR').toUpperCase();
  if (currUpper === 'INR') {
    return 1.0;
  }

  try {
    const rateResult = await db.query(
      `SELECT rate FROM exchange_rates 
       WHERE base = 'INR' AND currency = $1 
       ORDER BY rate_date DESC LIMIT 1`,
      [currUpper]
    );

    if (rateResult.rows.length > 0) {
      return parseFloat(rateResult.rows[0].rate);
    }
  } catch (err) {
    console.warn(`[getExchangeRateForCurrency] DB query error (${err.message}). Trying fallback.`);
  }

  // Fallback to static JSON
  try {
    const fallbackPath = path.join(__dirname, '../db/fixtures/fallbackRates.json');
    if (fs.existsSync(fallbackPath)) {
      const fallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      if (fallback.rates && fallback.rates[currUpper]) {
        return parseFloat(fallback.rates[currUpper]);
      }
    }
  } catch (err) {
    // Ignore fallback reading error
  }

  return 1.0;
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

// GET /api/bookings - List all bookings for current user
async function getMyBookings(req, res, next) {
  try {
    const { type, status, trip_id } = req.query;

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

    const result = await db.query(
      `SELECT b.*,
              h.name AS hotel_name, h.city AS hotel_city, h.stars AS hotel_stars,
              h.rating AS hotel_rating, h.image_url AS hotel_image_url,
              h.price_per_night AS hotel_price_per_night,
              t.name AS trip_name
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN trips t ON b.trip_id = t.id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC`,
      values
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
      })),
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
              t.name AS trip_name
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
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
      `SELECT b.*, h.name AS hotel_name 
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
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

    const updateResult = await client.query(
      `UPDATE bookings 
       SET status = 'cancelled' 
       WHERE id = $1 
       RETURNING *`,
      [bookingId]
    );

    // Create notification
    const entityName = booking.hotel_name || 'Reservation';
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

module.exports = {
  createHotelBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};
