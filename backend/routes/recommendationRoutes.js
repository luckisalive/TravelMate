const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { optionalAuth } = require('../middleware/auth');

// Recommendations can be accessed publicly or with user preference context
router.use(optionalAuth);

// GET /api/recommendations/hotels
router.get('/hotels', recommendationController.getRecommendedHotels);

// GET /api/recommendations/transport
router.get('/transport', recommendationController.getRecommendedTransport);

// GET /api/recommendations/trip/:id
router.get('/trip/:id', recommendationController.getTripRecommendations);

module.exports = router;
