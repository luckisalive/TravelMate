const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const rateRoutes = require('./routes/rateRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const transportRoutes = require('./routes/transportRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const estimatorRoutes = require('./routes/estimatorRoutes');
const { startRateSyncCron } = require('./services/rateSyncService');

const app = express();
const PORT = process.env.PORT || 5000;

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://travel-mate-cyan-beta.vercel.app',
  'https://travelmate-frontend.vercel.app',
];

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

// Security & Parsing Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, internal tests)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');
    const isVercelDeployment = /^https:\/\/travel-?mate[a-z0-9-]*\.vercel\.app$/.test(normalizedOrigin) || normalizedOrigin.endsWith('.vercel.app');

    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin) || isVercelDeployment) {
      return callback(null, true);
    }

    const corsErr = new Error(`Origin ${origin} not allowed by CORS policy`);
    corsErr.statusCode = 403;
    return callback(corsErr);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

const db = require('./config/db');

// Health Check Handler (also warms database connection pool)
const healthHandler = async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'TravelMate API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      service: 'TravelMate API',
      database: 'error',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};

app.get(['/api/health', '/health'], healthHandler);

// Root and API Index Handlers
const rootHandler = (req, res) => {
  res.json({
    status: 'ok',
    service: 'TravelMate API',
    version: '1.0.0',
    documentation: 'https://github.com/luckisalive/TravelMate',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      hotels: '/api/hotels',
      transport: '/api/transport',
      trips: '/api/trips',
      estimator: '/api/estimator/estimate',
      rates: '/api/rates',
      reviews: '/api/reviews',
      notifications: '/api/notifications',
    },
    timestamp: new Date().toISOString(),
  });
};

app.get(['/', '/api', '/api/'], rootHandler);

// Mount Routes with /api prefix (primary)
app.use('/api/auth', authRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/estimator', estimatorRoutes);

// Dual-mount routes without /api prefix for client resilience
app.use('/auth', authRoutes);
app.use('/rates', rateRoutes);
app.use('/hotels', hotelRoutes);
app.use('/trips', tripRoutes);
app.use('/bookings', bookingRoutes);
app.use('/transport', transportRoutes);
app.use('/settlements', settlementRoutes);
app.use('/notifications', notificationRoutes);
app.use('/reviews', reviewRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/estimator', estimatorRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server & Background Services (only if not imported by test suite)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TravelMate API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    startRateSyncCron();
  });
}

module.exports = app;
