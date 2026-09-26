const db = require('../config/db');
const DEFAULT_ALLOWANCES = require('../config/allowanceConfig');
const RecommenderService = require('./recommenderService');

class EstimatorService {
  /**
   * Calculate side-by-side trip cost estimates for cheapest, balanced, and comfort styles
   * @param {Object} params
   * @param {string} params.city - Destination city (e.g. 'Goa')
   * @param {string} [params.origin] - Origin city or code (e.g. 'Mumbai' or 'BOM')
   * @param {number} [params.days] - Total duration in days (default 5)
   * @param {number} [params.nights] - Total stay nights (default days - 1)
   * @param {number} [params.budget] - Trip budget to compare against
   * @param {Object} [params.customAllowances] - Optional custom daily allowance overrides
   */
  static async calculateEstimate({
    city = 'Goa',
    origin = null,
    days = 4,
    nights = null,
    budget = 0,
    customAllowances = {},
  }) {
    const numDays = Math.max(1, parseInt(days, 10) || 4);
    const numNights = nights !== null && !isNaN(parseInt(nights, 10))
      ? Math.max(1, parseInt(nights, 10))
      : Math.max(1, numDays - 1);
    const targetBudget = Math.max(0, parseFloat(budget) || 0);

    // 1. Fetch available hotels in destination city
    const hotelsRes = await db.query(
      `SELECT * FROM hotels WHERE LOWER(city) = LOWER($1) ORDER BY price_per_night ASC`,
      [city]
    );
    const hotels = hotelsRes.rows;

    // 2. Fetch available transport options arriving in destination city
    const values = [city];
    let transportWhere = `WHERE LOWER(s_dest.city) = LOWER($1)`;

    if (origin) {
      values.push(origin.toUpperCase());
      transportWhere += ` AND (tr.origin_code = $2 OR LOWER(s_orig.city) = LOWER($2))`;
    }

    const transportRes = await db.query(
      `SELECT tr.*, s_orig.city AS origin_city, s_dest.city AS dest_city
       FROM transport_options tr
       JOIN stations s_dest ON tr.destination_code = s_dest.code
       JOIN stations s_orig ON tr.origin_code = s_orig.code
       ${transportWhere}
       ORDER BY tr.price ASC`,
      values
    );
    const transports = transportRes.rows;

    const styles = ['cheapest', 'balanced', 'comfort'];
    const packages = {};

    for (const style of styles) {
      const config = DEFAULT_ALLOWANCES[style] || DEFAULT_ALLOWANCES.balanced;
      const dailyAllowance = customAllowances[style] !== undefined && !isNaN(parseFloat(customAllowances[style]))
        ? parseFloat(customAllowances[style])
        : config.daily_allowance;

      // Select Hotel pick for this style
      let hotelPick = null;
      if (hotels.length > 0) {
        const scoredHotels = RecommenderService.scoreHotels(hotels, style);
        hotelPick = scoredHotels[0];
      }

      const hotelPricePerNight = hotelPick ? parseFloat(hotelPick.price_per_night) : (style === 'cheapest' ? 1200 : style === 'comfort' ? 5500 : 2800);
      const stayTotal = Math.round(hotelPricePerNight * numNights);

      // Select Transport pick for this style
      let outboundPick = null;
      let returnPick = null;

      if (transports.length > 0) {
        const scoredTransport = RecommenderService.scoreTransport(transports, style);
        outboundPick = scoredTransport[0];
        // For return, pick either next matching or mirror outbound fare
        returnPick = scoredTransport.length > 1 ? scoredTransport[1] : scoredTransport[0];
      }

      const outboundFare = outboundPick ? parseFloat(outboundPick.price) : (style === 'cheapest' ? 800 : style === 'comfort' ? 4500 : 2200);
      const returnFare = returnPick ? parseFloat(returnPick.price) : outboundFare;
      const transportTotal = Math.round(outboundFare + returnFare);

      // Daily allowance total
      const allowanceTotal = Math.round(dailyAllowance * numDays);

      // Total estimate
      const totalCost = transportTotal + stayTotal + allowanceTotal;
      const isOverBudget = targetBudget > 0 && totalCost > targetBudget;
      const variance = targetBudget > 0 ? targetBudget - totalCost : 0;
      const budgetUtilizationPct = targetBudget > 0 ? Math.round((totalCost / targetBudget) * 100) : null;

      packages[style] = {
        style,
        label: config.label,
        description: config.description,
        daily_allowance_rate: dailyAllowance,
        hotel: hotelPick ? {
          id: hotelPick.id,
          name: hotelPick.name,
          city: hotelPick.city,
          stars: parseFloat(hotelPick.stars),
          rating: parseFloat(hotelPick.rating),
          price_per_night: hotelPricePerNight,
          rationale: hotelPick.recommendation?.rationale,
        } : {
          name: `Estimated ${style} Hotel`,
          price_per_night: hotelPricePerNight,
        },
        transport_outbound: outboundPick ? {
          id: outboundPick.id,
          mode: outboundPick.mode,
          operator: outboundPick.operator,
          number: outboundPick.number,
          class: outboundPick.class,
          price: outboundFare,
        } : {
          mode: style === 'cheapest' ? 'train' : style === 'comfort' ? 'flight' : 'train/bus',
          price: outboundFare,
        },
        breakdown: {
          stay: {
            nights: numNights,
            rate_per_night: hotelPricePerNight,
            total: stayTotal,
          },
          transport: {
            outbound: outboundFare,
            return: returnFare,
            total: transportTotal,
          },
          allowance: {
            days: numDays,
            daily_rate: dailyAllowance,
            total: allowanceTotal,
          },
          total_estimate: totalCost,
        },
        budget_comparison: {
          budget: targetBudget,
          total_cost: totalCost,
          is_over_budget: isOverBudget,
          variance,
          budget_utilization_pct: budgetUtilizationPct,
          warning: isOverBudget
            ? `Predicted expenses exceed allocated budget by ₹${Math.abs(variance).toLocaleString('en-IN')}`
            : null,
        },
      };
    }

    return {
      destination_city: city,
      origin: origin || 'Flexible / Auto',
      days: numDays,
      nights: numNights,
      budget: targetBudget,
      packages,
      disclaimer: 'Estimates are computed based on generated catalog pricing and historical allowances for academic planning purposes.',
    };
  }

  /**
   * Run cost estimator against an existing trip record
   * @param {number} tripId 
   * @param {Object} [customAllowances]
   */
  static async estimateTrip(tripId, customAllowances = {}) {
    const tripRes = await db.query(
      `SELECT t.*, u.travel_style FROM trips t JOIN users u ON t.created_by = u.id WHERE t.id = $1`,
      [tripId]
    );

    if (tripRes.rows.length === 0) {
      return null;
    }

    const trip = tripRes.rows[0];

    // Determine destination from existing bookings or name
    let destinationCity = null;
    const bookingsRes = await db.query(
      `SELECT h.city AS hotel_city, s_dest.city AS transport_city
       FROM bookings b
       LEFT JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN transport_options tr ON b.transport_id = tr.id
       LEFT JOIN stations s_dest ON tr.destination_code = s_dest.code
       WHERE b.trip_id = $1 AND b.status <> 'cancelled'`,
      [tripId]
    );

    for (const b of bookingsRes.rows) {
      if (b.hotel_city) {
        destinationCity = b.hotel_city;
        break;
      }
      if (b.transport_city) {
        destinationCity = b.transport_city;
        break;
      }
    }

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
      destinationCity = 'Goa';
    }

    const startDateStr = typeof trip.start_date === 'string' ? trip.start_date.split('T')[0] : new Date(trip.start_date).toISOString().split('T')[0];
    const endDateStr = typeof trip.end_date === 'string' ? trip.end_date.split('T')[0] : new Date(trip.end_date).toISOString().split('T')[0];
    const diffTime = Math.abs(new Date(endDateStr) - new Date(startDateStr));
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const estimate = await this.calculateEstimate({
      city: destinationCity,
      days,
      budget: parseFloat(trip.budget) || 0,
      customAllowances,
    });

    return {
      trip_id: trip.id,
      trip_name: trip.name,
      start_date: startDateStr,
      end_date: endDateStr,
      ...estimate,
    };
  }
}

module.exports = EstimatorService;
