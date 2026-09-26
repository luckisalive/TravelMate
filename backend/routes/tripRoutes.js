const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { requireAuth } = require('../middleware/auth');

// All trip routes require authentication
router.use(requireAuth);

// GET /api/trips - List user's trips
router.get('/', tripController.getMyTrips);

// POST /api/trips - Create new trip
router.post('/', tripController.createTrip);

// GET /api/trips/:id - Get trip details
router.get('/:id', tripController.getTripById);

module.exports = router;
