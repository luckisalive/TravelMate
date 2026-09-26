const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const { requireAuth } = require('../middleware/auth');

// All settlement routes require authentication
router.use(requireAuth);

// GET /api/settlements?trip_id=:id
router.get('/', settlementController.getTripSettlements);

// POST /api/settlements - Log new settlement between trip members
router.post('/', settlementController.recordSettlement);

// DELETE /api/settlements/:id - Revert/delete settlement
router.delete('/:id', settlementController.deleteSettlement);

module.exports = router;
