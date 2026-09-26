const db = require('../config/db');
const { TRAVEL_STYLES } = require('../config/constants');

// Helper to determine amenities based on stars & price
function getAmenitiesForHotel(hotel) {
  const amenities = ['Free High-Speed Wi-Fi', 'Air Conditioning', '24/7 Front Desk', 'Luggage Storage'];
  if (parseFloat(hotel.stars) >= 4 || parseFloat(hotel.price_per_night) >= 5000) {
    amenities.push('Swimming Pool', 'Multi-Cuisine Restaurant', 'Fitness Center', 'Valet Parking');
  }
  if (parseFloat(hotel.stars) >= 5 || parseFloat(hotel.price_per_night) >= 10000) {
    amenities.push('Spa & Wellness Center', 'Concierge Service', 'Luxury Airport Shuttle', 'Executive Lounge');
  }
  if (parseFloat(hotel.stars) <= 3) {
    amenities.push('Daily Housekeeping', 'Complimentary Drinking Water');
  }
  return amenities;
}

// GET /api/hotels - List, filter, sort and paginate hotels
async function getHotels(req, res, next) {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      minStars,
      minRating,
      search,
      sortBy = 'recommended',
      style,
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];

    // Filter by city
    if (city && city.trim() !== '' && city.toLowerCase() !== 'all') {
      values.push(`%${city.trim()}%`);
      conditions.push(`city ILIKE $${values.length}`);
    }

    // Filter by price range
    if (minPrice && !isNaN(minPrice)) {
      values.push(parseFloat(minPrice));
      conditions.push(`price_per_night >= $${values.length}`);
    }
    if (maxPrice && !isNaN(maxPrice)) {
      values.push(parseFloat(maxPrice));
      conditions.push(`price_per_night <= $${values.length}`);
    }

    // Filter by minimum stars
    if (minStars && !isNaN(minStars)) {
      values.push(parseFloat(minStars));
      conditions.push(`stars >= $${values.length}`);
    }

    // Filter by minimum guest rating
    if (minRating && !isNaN(minRating)) {
      values.push(parseFloat(minRating));
      conditions.push(`rating >= $${values.length}`);
    }

    // Search query across name and city
    if (search && search.trim() !== '') {
      values.push(`%${search.trim()}%`);
      conditions.push(`(name ILIKE $${values.length} OR city ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM hotels ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].total, 10);

    // Database sorting logic (if standard sort)
    let orderBySql = 'ORDER BY id ASC';
    if (sortBy === 'price_asc') {
      orderBySql = 'ORDER BY price_per_night ASC, rating DESC';
    } else if (sortBy === 'price_desc') {
      orderBySql = 'ORDER BY price_per_night DESC, rating DESC';
    } else if (sortBy === 'rating_desc') {
      orderBySql = 'ORDER BY rating DESC, stars DESC';
    } else if (sortBy === 'stars_desc') {
      orderBySql = 'ORDER BY stars DESC, rating DESC';
    } else if (sortBy === 'name_asc') {
      orderBySql = 'ORDER BY name ASC';
    }

    // If recommended sort, we retrieve all matching rows for the filter to normalize scores,
    // then paginate in memory. If other sort, we paginate directly in SQL.
    let hotels = [];
    if (sortBy === 'recommended') {
      const allResults = await db.query(
        `SELECT id, name, city, stars, price_per_night, rating, image_url, lat, lon, osm_id 
         FROM hotels ${whereClause}`,
        values
      );

      const rows = allResults.rows.map((row) => ({
        ...row,
        stars: parseFloat(row.stars),
        price_per_night: parseFloat(row.price_per_night),
        rating: parseFloat(row.rating),
        lat: row.lat ? parseFloat(row.lat) : null,
        lon: row.lon ? parseFloat(row.lon) : null,
      }));

      if (rows.length > 0) {
        // Min-max normalization for price
        const minP = Math.min(...rows.map((h) => h.price_per_night));
        const maxP = Math.max(...rows.map((h) => h.price_per_night));
        const priceDiff = maxP - minP || 1;

        // Preference weighting (PRD Section 10)
        const travelStyleKey = style || (req.user && req.user.travel_style) || 'balanced';
        const weights = TRAVEL_STYLES[travelStyleKey] || TRAVEL_STYLES.balanced;
        const wPrice = weights.w_price;
        const wComfort = weights.w_comfort;

        const scoredRows = rows.map((h) => {
          // Cheapest has price_score = 1.0, most expensive has 0.0
          const priceScore = (maxP - h.price_per_night) / priceDiff;
          // Comfort = 0.5 * (stars / 5) + 0.5 * (rating / 5)
          const comfortScore = 0.5 * (h.stars / 5.0) + 0.5 * (h.rating / 5.0);
          const score = parseFloat((wPrice * priceScore + wComfort * comfortScore).toFixed(4));

          let reason = 'Balanced value pick';
          if (h.price_per_night === minP) {
            reason = 'Cheapest option in this search';
          } else if (h.stars >= 5 && h.rating >= 4.7) {
            reason = 'Highest comfort & luxury rating';
          } else if (priceScore >= 0.7 && comfortScore >= 0.7) {
            reason = 'Top value: high comfort at budget rate';
          }

          return {
            ...h,
            recommendation_score: score,
            recommendation_reason: reason,
            amenities: getAmenitiesForHotel(h),
          };
        });

        // Sort descending by recommendation score
        scoredRows.sort((a, b) => b.recommendation_score - a.recommendation_score);

        // Slice pagination
        hotels = scoredRows.slice(offset, offset + limitNum);
      }
    } else {
      const pagedResult = await db.query(
        `SELECT id, name, city, stars, price_per_night, rating, image_url, lat, lon, osm_id 
         FROM hotels 
         ${whereClause} 
         ${orderBySql} 
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limitNum, offset]
      );

      hotels = pagedResult.rows.map((row) => {
        const h = {
          ...row,
          stars: parseFloat(row.stars),
          price_per_night: parseFloat(row.price_per_night),
          rating: parseFloat(row.rating),
          lat: row.lat ? parseFloat(row.lat) : null,
          lon: row.lon ? parseFloat(row.lon) : null,
        };
        return {
          ...h,
          amenities: getAmenitiesForHotel(h),
        };
      });
    }

    // Get distinct city summary for filter tabs
    const citiesSummary = await db.query(
      `SELECT city, COUNT(*) AS count, MIN(price_per_night) AS min_price, MAX(price_per_night) AS max_price 
       FROM hotels 
       GROUP BY city 
       ORDER BY city ASC`
    );

    return res.json({
      success: true,
      data: {
        hotels,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
        cities: citiesSummary.rows.map((c) => ({
          city: c.city,
          count: parseInt(c.count, 10),
          minPrice: parseFloat(c.min_price),
          maxPrice: parseFloat(c.max_price),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/hotels/:id - Get hotel details by ID with reviews
async function getHotelById(req, res, next) {
  try {
    const hotelId = parseInt(req.params.id, 10);
    if (isNaN(hotelId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid hotel ID format.' },
      });
    }

    const hotelResult = await db.query(
      `SELECT id, name, city, stars, price_per_night, rating, image_url, lat, lon, osm_id 
       FROM hotels 
       WHERE id = $1`,
      [hotelId]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Hotel not found.' },
      });
    }

    const rawHotel = hotelResult.rows[0];
    const hotel = {
      ...rawHotel,
      stars: parseFloat(rawHotel.stars),
      price_per_night: parseFloat(rawHotel.price_per_night),
      rating: parseFloat(rawHotel.rating),
      lat: rawHotel.lat ? parseFloat(rawHotel.lat) : null,
      lon: rawHotel.lon ? parseFloat(rawHotel.lon) : null,
      amenities: getAmenitiesForHotel(rawHotel),
    };

    // Fetch verified reviews for this hotel
    const reviewsResult = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name 
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.id
       JOIN users u ON r.user_id = u.id
       WHERE b.hotel_id = $1
       ORDER BY r.created_at DESC 
       LIMIT 10`,
      [hotelId]
    );

    return res.json({
      success: true,
      data: {
        hotel,
        reviews: reviewsResult.rows.map((rev) => ({
          id: rev.id,
          rating: rev.rating,
          comment: rev.comment,
          created_at: rev.created_at,
          reviewer_name: rev.reviewer_name,
        })),
        outboundSearchUrls: {
          bookingCom: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`,
          makeMyTrip: `https://www.makemytrip.com/hotels/hotel-listing/?searchText=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`,
          googleHotels: `https://www.google.com/travel/hotels?q=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`,
          airbnb: `https://www.airbnb.com/s/${encodeURIComponent(hotel.city)}/homes`,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/hotels/cities - List all cities with count
async function getCities(req, res, next) {
  try {
    const result = await db.query(
      `SELECT city, COUNT(*) AS count, MIN(price_per_night) AS min_price, MAX(price_per_night) AS max_price 
       FROM hotels 
       GROUP BY city 
       ORDER BY city ASC`
    );

    return res.json({
      success: true,
      data: result.rows.map((r) => ({
        city: r.city,
        count: parseInt(r.count, 10),
        minPrice: parseFloat(r.min_price),
        maxPrice: parseFloat(r.max_price),
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHotels,
  getHotelById,
  getCities,
};
