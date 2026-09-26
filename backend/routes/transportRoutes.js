const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');

// GET /api/transport/stations - List all stations for autocomplete / search
router.get('/stations', transportController.getStations);

// GET /api/transport - Search transport options with filters & sorting
router.get('/', transportController.getTransports);

// GET /api/transport/:id/seats - Flight Seat Map
router.get('/:id/seats', transportController.getTransportSeats);

// GET /api/transport/:id - Single transport details
router.get('/:id', transportController.getTransportById);

module.exports = router;
