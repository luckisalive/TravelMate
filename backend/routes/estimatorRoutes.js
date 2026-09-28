const express = require('express');
const router = express.Router();
const estimatorController = require('../controllers/estimatorController');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

// GET & POST /api/estimator/estimate - Generate estimate
router.get('/estimate', estimatorController.getEstimate);
router.post('/estimate', estimatorController.getEstimate);

// GET & POST /api/estimator - Default index
router.get('/', estimatorController.getEstimate);
router.post('/', estimatorController.getEstimate);

// GET & POST /api/estimator/trip/:id - Generate estimate for an existing trip
router.get('/trip/:id', estimatorController.getTripEstimate);
router.post('/trip/:id', estimatorController.getTripEstimate);

module.exports = router;
