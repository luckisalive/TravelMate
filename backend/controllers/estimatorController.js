const EstimatorService = require('../services/estimatorService');

/**
 * POST /api/estimator/estimate - Generate standalone trip cost estimate
 */
async function getEstimate(req, res, next) {
  try {
    const {
      city = 'Goa',
      origin,
      days = 4,
      nights,
      budget = 0,
      customAllowances = {},
    } = req.body;

    const estimate = await EstimatorService.calculateEstimate({
      city,
      origin,
      days,
      nights,
      budget,
      customAllowances,
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
 * POST /api/estimator/trip/:id & POST /api/trips/:id/estimate - Estimate for a specific trip
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

    const { customAllowances = {} } = req.body;
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
