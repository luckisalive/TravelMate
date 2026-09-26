const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const expenseController = require('../controllers/expenseController');
const settlementController = require('../controllers/settlementController');
const itineraryController = require('../controllers/itineraryController');
const estimatorController = require('../controllers/estimatorController');
const { requireAuth } = require('../middleware/auth');

// All trip & expense routes require authentication
router.use(requireAuth);

// --- Trip Core Routes ---
// GET /api/trips - List user's trips with financial aggregates
router.get('/', tripController.getMyTrips);

// POST /api/trips - Create new trip
router.post('/', tripController.createTrip);

// GET /api/trips/:id - Get trip details (members, bookings, expenses, budget)
router.get('/:id', tripController.getTripById);

// PUT /api/trips/:id - Update trip settings (budget, dates, name)
router.put('/:id', tripController.updateTrip);

// DELETE /api/trips/:id - Delete trip
router.delete('/:id', tripController.deleteTrip);

// --- Trip Members Management ---
// POST /api/trips/:id/members - Invite member to trip
router.post('/:id/members', tripController.addTripMember);

// DELETE /api/trips/:id/members/:userId - Remove member from trip
router.delete('/:id/members/:userId', tripController.removeTripMember);

// --- Expense Management Routes ---
// GET /api/trips/:id/expenses/analytics - Comprehensive spending analytics & charts
router.get('/:id/expenses/analytics', expenseController.getExpenseAnalytics);

// GET /api/trips/:id/expenses - List trip expenses with filters
router.get('/:id/expenses', expenseController.getTripExpenses);

// POST /api/trips/:id/expenses - Log new expense with server-side conversion & splitting
router.post('/:id/expenses', expenseController.createExpense);

// GET /api/trips/:id/expenses/:expenseId - Single expense details
router.get('/:id/expenses/:expenseId', expenseController.getExpenseById);

// PUT /api/trips/:id/expenses/:expenseId - Update expense
router.put('/:id/expenses/:expenseId', expenseController.updateExpense);

// DELETE /api/trips/:id/expenses/:expenseId - Delete expense
router.delete('/:id/expenses/:expenseId', expenseController.deleteExpense);

// --- Settlement & Debt Simplification Routes ---
// GET /api/trips/:id/balances - Net balances & greedy debt simplification
router.get('/:id/balances', settlementController.getTripBalances);

// GET /api/trips/:id/settlements - List recorded settlements for trip
router.get('/:id/settlements', settlementController.getTripSettlements);

// POST /api/trips/:id/settlements - Log new settlement for trip
router.post('/:id/settlements', settlementController.recordSettlement);

// DELETE /api/trips/:id/settlements/:settlementId - Delete settlement record
router.delete('/:id/settlements/:settlementId', settlementController.deleteSettlement);

// --- Itinerary Planner Routes ---
// GET /api/trips/:id/itinerary - Day-wise activities and unlinked bookings
router.get('/:id/itinerary', itineraryController.getTripItinerary);

// POST /api/trips/:id/itinerary - Add activity
router.post('/:id/itinerary', itineraryController.createItineraryItem);

// POST /api/trips/:id/itinerary/sync-bookings - Auto-link transport & hotel bookings
router.post('/:id/itinerary/sync-bookings', itineraryController.syncBookingsToItinerary);

// POST /api/trips/:id/itinerary/reorder - Reorder activities
router.post('/:id/itinerary/reorder', itineraryController.reorderItineraryItems);

// PUT /api/trips/:id/itinerary/:itemId - Update activity
router.put('/:id/itinerary/:itemId', itineraryController.updateItineraryItem);

// DELETE /api/trips/:id/itinerary/:itemId - Delete activity
router.delete('/:id/itinerary/:itemId', itineraryController.deleteItineraryItem);

// --- Trip Cost Estimator Route ---
// POST & GET /api/trips/:id/estimate - Calculate predicted cost vs budget
router.post('/:id/estimate', estimatorController.getTripEstimate);
router.get('/:id/estimate', estimatorController.getTripEstimate);

module.exports = router;

