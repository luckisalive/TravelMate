const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');

// All booking endpoints require authentication
router.use(requireAuth);

// POST /api/bookings/hotel - Book hotel
router.post('/hotel', bookingController.createHotelBooking);

// GET /api/bookings - List current user's bookings
router.get('/', bookingController.getMyBookings);

// GET /api/bookings/:id - Single booking details
router.get('/:id', bookingController.getBookingById);

// PATCH /api/bookings/:id/cancel & POST /api/bookings/:id/cancel - Cancel booking
router.patch('/:id/cancel', bookingController.cancelBooking);
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
