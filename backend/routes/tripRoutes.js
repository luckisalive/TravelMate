const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const expenseController = require('../controllers/expenseController');
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

// POST /api/trips/:id/expenses - Log new expense with server-side conversion
router.post('/:id/expenses', expenseController.createExpense);

// GET /api/trips/:id/expenses/:expenseId - Single expense details
router.get('/:id/expenses/:expenseId', expenseController.getExpenseById);

// PUT /api/trips/:id/expenses/:expenseId - Update expense
router.put('/:id/expenses/:expenseId', expenseController.updateExpense);

// DELETE /api/trips/:id/expenses/:expenseId - Delete expense
router.delete('/:id/expenses/:expenseId', expenseController.deleteExpense);

module.exports = router;
