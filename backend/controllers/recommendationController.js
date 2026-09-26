const db = require('../config/db');
const RecommenderService = require('../services/recommenderService');

/**
 * GET /api/recommendations/hotels - Recommend hotels by style
 */
async function getRecommendedHotels(req, res, next) {
  try {
    const { city = 'Goa', style = 'balanced' } = req.query;

    const result = await db.query(
      `SELECT * FROM hotels 
       WHERE LOWER(city) = LOWER($1) 
       ORDER BY price_per_night ASC`,
      [city]
    );

    const scored = RecommenderService.scoreHotels(result.rows, style);

    return res.json({
      success: true,
      city,
      travel_style: style,
      count: scored.length,
      top_picks: scored.slice(0, 3),
      data: scored,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/recommendations/transport - Recommend transport by style
 */
async function getRecommendedTransport(req, res, next) {
  try {
    const { origin, destination, style = 'balanced' } = req.query;

    const values = [];
    const conditions = [];

    if (origin) {
      values.push(origin.toUpperCase());
      conditions.push(`(tr.origin_code = $${values.length} OR LOWER(s_orig.city) = LOWER($${values.length}))`);
    }

    if (destination) {
      values.push(destination.toUpperCase());
      conditions.push(`(tr.destination_code = $${values.length} OR LOWER(s_dest.city) = LOWER($${values.length}))`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT tr.*, 
              s_orig.name AS origin_name, s_orig.city AS origin_city,
              s_dest.name AS dest_name, s_dest.city AS dest_city
       FROM transport_options tr
       JOIN stations s_orig ON tr.origin_code = s_orig.code
       JOIN stations s_dest ON tr.destination_code = s_dest.code
       ${whereClause}
       ORDER BY tr.price ASC`,
      values
    );

    const scored = RecommenderService.scoreTransport(result.rows, style);

    return res.json({
      success: true,
      origin: origin || 'All',
      destination: destination || 'All',
      travel_style: style,
      count: scored.length,
      top_picks: scored.slice(0, 3),
      data: scored,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/recommendations/trip/:id - Recommend top options for an existing trip
 */
async function getTripRecommendations(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid trip ID format.' },
      });
    }

    const style = req.query.style || (req.user ? req.user.travel_style : 'balanced');
    const recs = await RecommenderService.getTripRecommendations(tripId, style);

    if (!recs) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found.' },
      });
    }

    return res.json({
      success: true,
      data: recs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecommendedHotels,
  getRecommendedTransport,
  getTripRecommendations,
};
