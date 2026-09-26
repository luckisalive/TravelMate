const db = require('../config/db');

/**
 * Recommender Service (ADR-009 & PRD Section 10)
 * Evaluates candidates using transparent weighted heuristics based on travel style:
 * - cheapest: w_price = 0.8, w_comfort = 0.2
 * - balanced: w_price = 0.5, w_comfort = 0.5
 * - comfort:  w_price = 0.2, w_comfort = 0.8
 */

const STYLE_WEIGHTS = {
  cheapest: { w_price: 0.8, w_comfort: 0.2 },
  balanced: { w_price: 0.5, w_comfort: 0.5 },
  comfort:  { w_price: 0.2, w_comfort: 0.8 },
};

const CLASS_COMFORT_SCORES = {
  // Flight classes
  'First': 1.0,
  'Business': 0.95,
  'Premium Economy': 0.80,
  'Economy': 0.70,

  // Train classes
  '1AC': 1.0,
  'Executive Class': 0.95,
  '2AC': 0.80,
  '3AC': 0.60,
  'Sleeper': 0.30,
  'Second Sitting': 0.20,

  // Bus classes
  'AC Volvo': 0.85,
  'Multi-Axle AC': 0.85,
  'Sleeper': 0.60,
  'Standard': 0.35,
};

class RecommenderService {
  /**
   * Score and rank an array of hotel objects by travel style
   * @param {Array} hotels 
   * @param {string} travelStyle - 'cheapest' | 'balanced' | 'comfort'
   * @returns {Array} ranked hotels with score, rank, and rationale
   */
  static scoreHotels(hotels, travelStyle = 'balanced') {
    if (!hotels || hotels.length === 0) return [];

    const weights = STYLE_WEIGHTS[travelStyle.toLowerCase()] || STYLE_WEIGHTS.balanced;
    const prices = hotels.map((h) => parseFloat(h.price_per_night) || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const scored = hotels.map((h) => {
      const price = parseFloat(h.price_per_night) || 0;
      const stars = Math.min(5, Math.max(1, parseFloat(h.stars) || 3));
      const rating = Math.min(5, Math.max(1, parseFloat(h.rating) || 4));

      // Min-max normalized price score (1.0 = cheapest, 0.0 = most expensive)
      const priceScore = maxPrice === minPrice ? 1.0 : (maxPrice - price) / (maxPrice - minPrice);

      // Hotel comfort = 0.5 * (stars / 5) + 0.5 * (rating / 5)
      const comfortScore = 0.5 * (stars / 5) + 0.5 * (rating / 5);

      // Combined score 0.0 - 1.0
      const combinedScore = weights.w_price * priceScore + weights.w_comfort * comfortScore;
      const scorePct = Math.round(combinedScore * 100);

      // Transparent rationale generator
      let rationale = '';
      if (price === minPrice) {
        rationale = `Cheapest option in city at ₹${price.toFixed(0)}/night`;
      } else if (stars >= 4.5 && rating >= 4.5) {
        rationale = `Top-tier luxury (${stars}★) with outstanding ${rating} rating`;
      } else if (travelStyle === 'comfort') {
        rationale = `High comfort choice: ${stars}★ rating with premium amenities`;
      } else if (travelStyle === 'cheapest') {
        rationale = `Budget-friendly stay at ₹${price.toFixed(0)}/night (${stars}★)`;
      } else {
        rationale = `Optimal balance: ${stars}★ comfort with ${rating} rating for ₹${price.toFixed(0)}/night`;
      }

      return {
        ...h,
        recommendation: {
          style: travelStyle,
          score: scorePct,
          price_score: Math.round(priceScore * 100),
          comfort_score: Math.round(comfortScore * 100),
          rationale,
        },
      };
    });

    // Sort descending by recommendation score
    scored.sort((a, b) => b.recommendation.score - a.recommendation.score);

    // Assign rank and top 3 flag
    return scored.map((item, index) => ({
      ...item,
      recommendation: {
        ...item.recommendation,
        rank: index + 1,
        is_top_pick: index < 3,
      },
    }));
  }

  /**
   * Score and rank an array of transport options by travel style
   * @param {Array} transports 
   * @param {string} travelStyle - 'cheapest' | 'balanced' | 'comfort'
   * @returns {Array} ranked transport options with score, rank, and rationale
   */
  static scoreTransport(transports, travelStyle = 'balanced') {
    if (!transports || transports.length === 0) return [];

    const weights = STYLE_WEIGHTS[travelStyle.toLowerCase()] || STYLE_WEIGHTS.balanced;

    // Helper to calculate duration in minutes
    const getDurationMins = (t) => {
      const dep = new Date(t.departs_at).getTime();
      const arr = new Date(t.arrives_at).getTime();
      return Math.max(1, Math.round((arr - dep) / 60000));
    };

    const prices = transports.map((t) => parseFloat(t.price) || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const durations = transports.map(getDurationMins);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const scored = transports.map((t) => {
      const price = parseFloat(t.price) || 0;
      const durationMins = getDurationMins(t);

      // Price score (1.0 = lowest fare)
      const priceScore = maxPrice === minPrice ? 1.0 : (maxPrice - price) / (maxPrice - minPrice);

      // Duration score (1.0 = shortest transit time)
      const durationScore = maxDuration === minDuration ? 1.0 : (maxDuration - durationMins) / (maxDuration - minDuration);

      // Class score lookup with fallback
      const classKey = Object.keys(CLASS_COMFORT_SCORES).find((k) =>
        (t.class || '').toLowerCase().includes(k.toLowerCase())
      );
      const classScore = classKey ? CLASS_COMFORT_SCORES[classKey] : 0.5;

      // Transport comfort = 0.5 * duration_score + 0.5 * class_score
      const comfortScore = 0.5 * durationScore + 0.5 * classScore;

      // Combined score
      const combinedScore = weights.w_price * priceScore + weights.w_comfort * comfortScore;
      const scorePct = Math.round(combinedScore * 100);

      const durationHours = (durationMins / 60).toFixed(1);
      let rationale = '';
      if (price === minPrice) {
        rationale = `Lowest transit fare available at ₹${price.toFixed(0)}`;
      } else if (durationMins === minDuration) {
        rationale = `Fastest route: only ${durationHours}h via ${t.mode}`;
      } else if (travelStyle === 'comfort') {
        rationale = `Premium ${t.class} comfort with fast ${durationHours}h travel`;
      } else if (travelStyle === 'cheapest') {
        rationale = `Budget-conscious ${t.mode} at ₹${price.toFixed(0)}`;
      } else {
        rationale = `Best value ${t.mode}: ${durationHours}h travel in ${t.class} for ₹${price.toFixed(0)}`;
      }

      return {
        ...t,
        duration_minutes: durationMins,
        recommendation: {
          style: travelStyle,
          score: scorePct,
          price_score: Math.round(priceScore * 100),
          comfort_score: Math.round(comfortScore * 100),
          rationale,
        },
      };
    });

    // Sort descending by recommendation score
    scored.sort((a, b) => b.recommendation.score - a.recommendation.score);

    return scored.map((item, index) => ({
      ...item,
      recommendation: {
        ...item.recommendation,
        rank: index + 1,
        is_top_pick: index < 3,
      },
    }));
  }

  /**
   * Recommend top hotels and transport options for an existing trip
   * @param {number} tripId 
   * @param {string} [travelStyle]
   */
  static async getTripRecommendations(tripId, travelStyle = null) {
    // 1. Fetch trip details and determine destination
    const tripResult = await db.query(
      `SELECT t.*, u.travel_style AS user_travel_style
       FROM trips t
       JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [tripId]
    );

    if (tripResult.rows.length === 0) {
      return null;
    }

    const trip = tripResult.rows[0];
    const effectiveStyle = travelStyle || trip.user_travel_style || 'balanced';

    // 2. Discover destination city from trip name or existing bookings
    let destinationCity = null;
    const existingBookings = await db.query(
      `SELECT h.city AS hotel_city, s_dest.city AS transport_city
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN stations s_dest ON tr.destination_code = s_dest.code
       WHERE b.trip_id = $1 AND b.status <> 'cancelled'`,
      [tripId]
    );

    for (const b of existingBookings.rows) {
      if (b.hotel_city) {
        destinationCity = b.hotel_city;
        break;
      }
      if (b.transport_city) {
        destinationCity = b.transport_city;
        break;
      }
    }

    // Fallback: extract city keyword from trip name (e.g. "Goa Beach Holiday" -> "Goa")
    if (!destinationCity) {
      const cities = ['Goa', 'Mumbai', 'Delhi', 'Jaipur', 'Bengaluru'];
      for (const c of cities) {
        if (trip.name.toLowerCase().includes(c.toLowerCase())) {
          destinationCity = c;
          break;
        }
      }
    }

    if (!destinationCity) {
      destinationCity = 'Goa'; // default demo city
    }

    // 3. Query candidate hotels in destination city
    const hotelsResult = await db.query(
      `SELECT * FROM hotels WHERE LOWER(city) = LOWER($1) ORDER BY price_per_night ASC LIMIT 20`,
      [destinationCity]
    );

    const scoredHotels = this.scoreHotels(hotelsResult.rows, effectiveStyle);

    // 4. Query candidate transport arriving in destination city
    const transportResult = await db.query(
      `SELECT tr.*, s_orig.city AS origin_city, s_dest.city AS dest_city
       FROM transport_options tr
       JOIN stations s_dest ON tr.destination_code = s_dest.code
       JOIN stations s_orig ON tr.origin_code = s_orig.code
       WHERE LOWER(s_dest.city) = LOWER($1)
       ORDER BY tr.price ASC
       LIMIT 20`,
      [destinationCity]
    );

    const scoredTransport = this.scoreTransport(transportResult.rows, effectiveStyle);

    return {
      trip_id: tripId,
      trip_name: trip.name,
      destination_city: destinationCity,
      travel_style: effectiveStyle,
      recommended_hotels: scoredHotels.slice(0, 3),
      recommended_transport: scoredTransport.slice(0, 3),
      all_hotels_count: scoredHotels.length,
      all_transport_count: scoredTransport.length,
    };
  }
}

module.exports = RecommenderService;
