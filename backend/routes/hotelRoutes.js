const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { optionalAuth } = require('../middleware/auth');

// GET /api/hotels - List hotels with optional auth for personalized recommendations
router.get('/', optionalAuth, hotelController.getHotels);

// GET /api/hotels/cities - List distinct cities with hotel counts
router.get('/cities', hotelController.getCities);

// GET /api/hotels/:id - Get hotel details by ID with reviews
router.get('/:id', hotelController.getHotelById);

module.exports = router;
