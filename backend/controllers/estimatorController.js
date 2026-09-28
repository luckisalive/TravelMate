const EstimatorService = require('../services/estimatorService');

/**
 * POST & GET /api/estimator/estimate - Generate standalone trip cost estimate
 */
async function getEstimate(req, res, next) {
  try {
    const input = req.method === 'GET' ? { ...req.query, ...req.body } : { ...req.body, ...req.query };
    const {
      city = 'Goa',
      origin,
      days = 4,
      nights,
      budget = 0,
      customAllowances = {},
    } = input;

    let allowances = customAllowances;
    if (typeof allowances === 'string') {
      try {
        allowances = JSON.parse(allowances);
      } catch {
        allowances = {};
      }
    }

    const estimate = await EstimatorService.calculateEstimate({
      city: city || 'Goa',
      origin: origin || null,
      days: parseInt(days, 10) || 4,
      nights: nights !== undefined ? parseInt(nights, 10) : null,
      budget: parseFloat(budget) || 0,
      customAllowances: allowances,
    });

    return res.json({
      success: true,
      data: estimate,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST & GET /api/estimator/trip/:id & /api/trips/:id/estimate - Estimate for a specific trip
 */
async function getTripEstimate(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid trip ID format.' },
      });
    }

    const input = req.method === 'GET' ? { ...req.query, ...req.body } : { ...req.body, ...req.query };
    let { customAllowances = {} } = input;
    if (typeof customAllowances === 'string') {
      try {
        customAllowances = JSON.parse(customAllowances);
      } catch {
        customAllowances = {};
      }
    }

    const estimate = await EstimatorService.estimateTrip(tripId, customAllowances);

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found.' },
      });
    }

    return res.json({
      success: true,
      data: estimate,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEstimate,
  getTripEstimate,
};
