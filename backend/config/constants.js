// System-wide constants, rates, and configuration values

module.exports = {
  BASE_CURRENCY: process.env.BASE_CURRENCY || 'INR',

  // Recommendation Scoring Weights (w_price + w_comfort = 1.0)
  TRAVEL_STYLES: {
    cheapest: {
      w_price: 0.8,
      w_comfort: 0.2,
      dailyAllowance: 1000, // INR/day estimate for food & local transit
    },
    balanced: {
      w_price: 0.5,
      w_comfort: 0.5,
      dailyAllowance: 2500,
    },
    comfort: {
      w_price: 0.2,
      w_comfort: 0.8,
      dailyAllowance: 5000,
    },
  },

  // Train Class Comfort Ranks & Multipliers (0 - 1 comfort scale)
  TRAIN_CLASSES: {
    'SL':  { name: 'Sleeper', comfortScore: 0.3, fareMultiplier: 0.6 },
    '3AC': { name: 'AC 3 Tier', comfortScore: 0.6, fareMultiplier: 1.2 },
    '2AC': { name: 'AC 2 Tier', comfortScore: 0.85, fareMultiplier: 1.8 },
    '1AC': { name: 'AC First Class', comfortScore: 1.0, fareMultiplier: 2.8 },
  },

  // Flight Class Ranks
  FLIGHT_CLASSES: {
    'Economy': { name: 'Economy', comfortScore: 0.7, fareMultiplier: 1.0 },
    'Business': { name: 'Business', comfortScore: 1.0, fareMultiplier: 2.5 },
  },

  // Bus Class Ranks
  BUS_CLASSES: {
    'Standard': { name: 'Standard Non-AC', comfortScore: 0.4, fareMultiplier: 0.8 },
    'AC Sleeper': { name: 'AC Sleeper Volvo', comfortScore: 0.75, fareMultiplier: 1.3 },
  },

  // Base per-km rate (INR) for procedural synthetic fare generation
  PER_KM_RATES: {
    flight: 4.8,
    train: 1.2,
    bus: 1.8,
  },

  // Primary Cities for Demo & Curated Fixtures
  DEMO_CITIES: ['Mumbai', 'Delhi', 'Bengaluru', 'Goa', 'Jaipur'],
};
