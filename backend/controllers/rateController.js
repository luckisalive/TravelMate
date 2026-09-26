const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// GET /api/rates - Fetch latest cached exchange rates
async function getLatestRates(req, res, next) {
  try {
    const result = await db.query(
      `SELECT currency, rate, rate_date 
       FROM exchange_rates 
       WHERE base = 'INR' 
       ORDER BY rate_date DESC`
    );

    if (result.rows.length > 0) {
      const rates = {};
      let latestDate = result.rows[0].rate_date;

      for (const row of result.rows) {
        if (!rates[row.currency]) {
          rates[row.currency] = parseFloat(row.rate);
        }
      }

      // Guarantee INR is present
      rates.INR = 1.0;

      return res.json({
        success: true,
        base: 'INR',
        date: latestDate,
        rates,
      });
    }

    // Fallback to static fixture if no rows in DB
    const fallbackPath = path.join(__dirname, '../db/fixtures/fallbackRates.json');
    if (fs.existsSync(fallbackPath)) {
      const fallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      return res.json({
        success: true,
        base: 'INR',
        date: fallback.date || new Date().toISOString().split('T')[0],
        rates: { ...fallback.rates, INR: 1.0 },
        isFallback: true,
      });
    }

    return res.json({
      success: true,
      base: 'INR',
      date: new Date().toISOString().split('T')[0],
      rates: { INR: 1.0, USD: 0.0119, EUR: 0.0108, GBP: 0.0092, AED: 0.0437 },
      isFallback: true,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLatestRates,
};
