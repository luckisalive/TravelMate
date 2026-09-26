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

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : defaultOrigins;

// Security & Parsing Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, internal tests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TravelMate API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
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
