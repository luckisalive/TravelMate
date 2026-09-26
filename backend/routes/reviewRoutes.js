const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Public route to view reviews for a hotel
router.get('/hotel/:hotelId', optionalAuth, reviewController.getHotelReviews);

// Protected routes
router.use(requireAuth);

// POST /api/reviews - Submit review for completed booking
router.post('/', reviewController.createReview);

// GET /api/reviews/my - Current user's reviews
router.get('/my', reviewController.getMyReviews);

// GET /api/reviews/booking/:bookingId - Review for a specific booking
router.get('/booking/:bookingId', reviewController.getBookingReview);

module.exports = router;
