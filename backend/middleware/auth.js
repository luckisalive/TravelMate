const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Enforce valid JWT Bearer token
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. No Bearer token provided.' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travelmate_super_secret_jwt_key_2026_bca_secure');
    req.user = decoded; // { id, email, name }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token.' },
    });
  }
}

// Optional Auth (for public listings that adapt if user is logged in)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travelmate_super_secret_jwt_key_2026_bca_secure');
      req.user = decoded;
    } catch (err) {
      // Ignore invalid token for optional endpoints
    }
  }
  next();
}

// IDOR Security Guard: Verify user has access to a specific trip
async function verifyTripAccess(req, res, next) {
  const tripId = req.params.tripId || req.params.id || req.body.trip_id;

  if (!tripId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Trip ID is required for access verification.' },
    });
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.created_by, tm.role 
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = $1
       WHERE t.id = $2 AND (t.created_by = $1 OR tm.user_id = $1)`,
      [req.user.id, tripId]
    );

    if (result.rows.length === 0) {
      // Return 404 to avoid leaking existence of trips owned by others
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or unauthorized.' },
      });
    }

    req.tripAccess = {
      tripId,
      isOwner: result.rows[0].created_by === req.user.id,
      role: result.rows[0].role || (result.rows[0].created_by === req.user.id ? 'owner' : 'member'),
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  verifyTripAccess,
};
