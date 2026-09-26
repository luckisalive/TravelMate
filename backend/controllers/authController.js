const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'travelmate_super_secret_jwt_key_2026_bca_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token helper
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Format safe user object (omit password_hash)
function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currency_pref: user.currency_pref,
    display_currency: user.display_currency,
    travel_style: user.travel_style,
    created_at: user.created_at,
  };
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password, currency_pref, travel_style } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and password are required fields.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long.' },
      });
    }

    // Check if email already registered
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'An account with this email address already exists.' },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertResult = await db.query(
      `INSERT INTO users (name, email, password_hash, currency_pref, display_currency, travel_style)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, currency_pref, display_currency, travel_style, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        currency_pref || 'INR',
        currency_pref || 'INR',
        travel_style || 'balanced',
      ]
    );

    const user = insertResult.rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Account registered successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required.' },
      });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, currency_pref, display_currency, travel_style, created_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: 'Login successful.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/profile (Protected by requireAuth)
async function getProfile(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, name, email, currency_pref, display_currency, travel_style, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' },
      });
    }

    return res.json({
      success: true,
      user: sanitizeUser(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/profile (Protected by requireAuth)
async function updateProfile(req, res, next) {
  try {
    const { name, currency_pref, display_currency, travel_style, password } = req.body;

    // Validate travel_style if provided
    if (travel_style && !['cheapest', 'balanced', 'comfort'].includes(travel_style)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Travel style must be one of: cheapest, balanced, comfort.' },
      });
    }

    let passwordHash = null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: { message: 'New password must be at least 6 characters long.' },
        });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    let updateQuery;
    let queryParams;

    if (passwordHash) {
      updateQuery = `
        UPDATE users 
        SET name = COALESCE($1, name),
            currency_pref = COALESCE($2, currency_pref),
            display_currency = COALESCE($3, display_currency),
            travel_style = COALESCE($4, travel_style),
            password_hash = $5
        WHERE id = $6
        RETURNING id, name, email, currency_pref, display_currency, travel_style, created_at
      `;
      queryParams = [name, currency_pref, display_currency, travel_style, passwordHash, req.user.id];
    } else {
      updateQuery = `
        UPDATE users 
        SET name = COALESCE($1, name),
            currency_pref = COALESCE($2, currency_pref),
            display_currency = COALESCE($3, display_currency),
            travel_style = COALESCE($4, travel_style)
        WHERE id = $5
        RETURNING id, name, email, currency_pref, display_currency, travel_style, created_at
      `;
      queryParams = [name, currency_pref, display_currency, travel_style, req.user.id];
    }

    const result = await db.query(updateQuery, queryParams);

    return res.json({
      success: true,
      user: sanitizeUser(result.rows[0]),
      message: 'Profile updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
