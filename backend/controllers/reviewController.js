const db = require('../config/db');
const NotificationService = require('../services/notificationService');

/**
 * Reviews & Ratings Controller
 * Enforces review restrictions: only completed bookings, one review per booking, 1-5 rating.
 * Updates cached hotel ratings dynamically upon review creation.
 */

// POST /api/reviews - Submit review for completed booking
async function createReview(req, res, next) {
  const client = await db.getClient();
  try {
    const { booking_id, rating, comment } = req.body;
    const bookingId = parseInt(booking_id, 10);
    const parsedRating = parseInt(rating, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'A valid booking_id is required.' },
      });
    }

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rating must be an integer between 1 and 5.' },
      });
    }

    // 1. Fetch booking and verify ownership (IDOR protection)
    const bookingResult = await client.query(
      `SELECT b.*, h.name AS hotel_name, tr.operator AS transport_operator, tr.number AS transport_number
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Booking not found or unauthorized.' },
      });
    }

    const booking = bookingResult.rows[0];

    // 2. Restricted status check: cannot review cancelled bookings
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot review a cancelled booking.' },
      });
    }

    // 3. Unique review check: only one review per booking
    const existingReview = await client.query(
      `SELECT id FROM reviews WHERE booking_id = $1`,
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'This booking has already been reviewed.' },
      });
    }

    await client.query('BEGIN');

    // 4. If booking is currently confirmed, transition it to 'completed'
    if (booking.status !== 'completed') {
      await client.query(
        `UPDATE bookings SET status = 'completed' WHERE id = $1`,
        [bookingId]
      );
    }

    // 5. Insert review record
    const insertResult = await client.query(
      `INSERT INTO reviews (user_id, booking_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [req.user.id, bookingId, parsedRating, (comment || '').trim()]
    );

    const review = insertResult.rows[0];

    // 6. If hotel booking, update cached average rating in hotels table
    let updatedHotelRating = null;
    if (booking.hotel_id) {
      const avgResult = await client.query(
        `SELECT ROUND(AVG(r.rating)::numeric, 2) AS avg_rating, COUNT(r.id) AS total_reviews
         FROM reviews r
         JOIN bookings b ON r.booking_id = b.id
         WHERE b.hotel_id = $1`,
        [booking.hotel_id]
      );

      if (avgResult.rows.length > 0 && avgResult.rows[0].avg_rating !== null) {
        updatedHotelRating = parseFloat(avgResult.rows[0].avg_rating);
        await client.query(
          `UPDATE hotels SET rating = $1 WHERE id = $2`,
          [updatedHotelRating, booking.hotel_id]
        );
      }
    }

    await client.query('COMMIT');

    // 7. Send confirmation in-app notification
    const entityTitle = booking.hotel_name || `${booking.transport_operator} ${booking.transport_number}` || 'Trip';
    await NotificationService.createNotification({
      userId: req.user.id,
      type: 'booking',
      message: `Your review for ${entityTitle} (${parsedRating}★) has been published. Thank you for your feedback!`,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: review.id,
        user_id: review.user_id,
        user_name: req.user.name,
        booking_id: review.booking_id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        hotel_id: booking.hotel_id,
        updated_hotel_rating: updatedHotelRating,
      },
      message: 'Review published successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/reviews/hotel/:hotelId - List reviews for a specific hotel
async function getHotelReviews(req, res, next) {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (isNaN(hotelId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid hotel ID format.' },
      });
    }

    const result = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.name AS user_name
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.id
       JOIN users u ON r.user_id = u.id
       WHERE b.hotel_id = $1
       ORDER BY r.created_at DESC`,
      [hotelId]
    );

    const statsResult = await db.query(
      `SELECT ROUND(AVG(r.rating)::numeric, 2) AS avg_rating, COUNT(r.id) AS review_count
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.id
       WHERE b.hotel_id = $1`,
      [hotelId]
    );

    return res.json({
      success: true,
      data: {
        hotel_id: hotelId,
        average_rating: statsResult.rows[0]?.avg_rating ? parseFloat(statsResult.rows[0].avg_rating) : null,
        review_count: parseInt(statsResult.rows[0]?.review_count, 10) || 0,
        reviews: result.rows.map((row) => ({
          id: row.id,
          rating: row.rating,
          comment: row.comment,
          created_at: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
          },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/booking/:bookingId - Get review for a specific booking
async function getBookingReview(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid booking ID format.' },
      });
    }

    const result = await db.query(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.booking_id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No review found for this booking.' },
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/my - List all reviews created by the authenticated user
async function getMyReviews(req, res, next) {
  try {
    const result = await db.query(
      `SELECT r.id, r.booking_id, r.rating, r.comment, r.created_at,
              b.hotel_id, b.transport_id, b.check_in, b.check_out,
              h.name AS hotel_name, h.city AS hotel_city,
              tr.operator AS transport_operator, tr.number AS transport_number, tr.mode AS transport_mode
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.id
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        booking_id: row.booking_id,
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
        hotel_name: row.hotel_name,
        hotel_city: row.hotel_city,
        transport_title: row.transport_operator ? `${row.transport_operator} ${row.transport_number} (${row.transport_mode})` : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReview,
  getHotelReviews,
  getBookingReview,
  getMyReviews,
};
