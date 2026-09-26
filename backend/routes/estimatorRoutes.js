const express = require('express');
const router = express.Router();
const estimatorController = require('../controllers/estimatorController');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

// POST /api/estimator/estimate - Generate estimate
router.post('/estimate', estimatorController.getEstimate);

// POST /api/estimator/trip/:id - Generate estimate for an existing trip
router.post('/trip/:id', estimatorController.getTripEstimate);
router.get('/trip/:id', estimatorController.getTripEstimate);

module.exports = router;
