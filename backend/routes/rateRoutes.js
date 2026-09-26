const express = require('express');
const router = express.Router();
const rateController = require('../controllers/rateController');

// GET /api/rates - Fetch latest rates
router.get('/', rateController.getLatestRates);

// POST /api/rates/sync - Trigger sync from Frankfurter/fallback
router.post('/sync', rateController.syncRates);

module.exports = router;
