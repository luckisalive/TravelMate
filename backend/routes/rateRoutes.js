const express = require('express');
const router = express.Router();
const rateController = require('../controllers/rateController');

// GET /api/rates
router.get('/', rateController.getLatestRates);

module.exports = router;
