const path = require('path');
const fs = require('fs');
const db = require('../config/db');

/**
 * Fetch the latest exchange rate for a given currency against base INR.
 * 1 INR = rate CURRENCY (e.g., 1 INR = 0.0119 USD)
 * @param {string} currency - 3-letter currency code (e.g. 'USD', 'EUR', 'INR')
 * @returns {Promise<number>} - Rate multiplier
 */
async function getExchangeRate(currency) {
  const currUpper = (currency || 'INR').trim().toUpperCase();
  if (currUpper === 'INR') {
    return 1.0;
  }

  // 1. Query latest rate from exchange_rates table in PostgreSQL
  try {
    const rateResult = await db.query(
      `SELECT rate FROM exchange_rates 
       WHERE base = 'INR' AND currency = $1 
       ORDER BY rate_date DESC LIMIT 1`,
      [currUpper]
    );

    if (rateResult.rows.length > 0) {
      return parseFloat(rateResult.rows[0].rate);
    }
  } catch (err) {
    console.warn(`[currency:getExchangeRate] DB lookup warning (${err.message}). Trying fallback.`);
  }

  // 2. Query fallback static JSON fixture
  try {
    const fallbackPath = path.join(__dirname, '../db/fixtures/fallbackRates.json');
    if (fs.existsSync(fallbackPath)) {
      const fallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      if (fallback.rates && fallback.rates[currUpper]) {
        return parseFloat(fallback.rates[currUpper]);
      }
    }
  } catch (err) {
    // Ignore error
  }

  // 3. Pegged AED to USD fallback if AED requested
  if (currUpper === 'AED') {
    const usdRate = await getExchangeRate('USD');
    return parseFloat((usdRate * 3.6725).toFixed(6));
  }

  // 4. Default static rate matrix if offline / unseeded
  const staticFallbacks = {
    USD: 0.0119,
    EUR: 0.0108,
    GBP: 0.0092,
    AED: 0.0437,
    AUD: 0.0182,
    CAD: 0.0163,
    SGD: 0.0159,
    JPY: 1.8350,
  };

  return staticFallbacks[currUpper] || 1.0;
}

/**
 * Converts a monetary amount from a given currency into base currency (INR).
 * Enforces server-side conversion and immutable accounting (ADR-004).
 * @param {number|string} amount - Original monetary amount
 * @param {string} currency - Source currency code
 * @returns {Promise<{ amount: number, currency: string, amount_base: number, rate_used: number }>}
 */
async function convertToBase(amount, currency = 'INR') {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Amount must be a positive numeric value.');
  }

  const currUpper = (currency || 'INR').trim().toUpperCase();
  if (currUpper === 'INR') {
    return {
      amount: parseFloat(numAmount.toFixed(2)),
      currency: 'INR',
      amount_base: parseFloat(numAmount.toFixed(2)),
      rate_used: 1.000000,
    };
  }

  const rate = await getExchangeRate(currUpper);
  if (!rate || rate <= 0) {
    throw new Error(`Invalid exchange rate encountered for currency ${currUpper}`);
  }

  // 1 INR = rate CURRENCY => amount INR = amount / rate
  const amountBase = parseFloat((numAmount / rate).toFixed(2));
  const rateUsed = parseFloat(rate.toFixed(6));

  return {
    amount: parseFloat(numAmount.toFixed(2)),
    currency: currUpper,
    amount_base: amountBase,
    rate_used: rateUsed,
  };
}

/**
 * Converts a base currency (INR) amount into a target currency for display.
 * @param {number|string} amountBase - Amount in INR
 * @param {string} targetCurrency - Target currency code
 * @returns {Promise<{ amount: number, currency: string, rate_used: number }>}
 */
async function convertFromBase(amountBase, targetCurrency = 'INR') {
  const numBase = parseFloat(amountBase) || 0;
  const targetUpper = (targetCurrency || 'INR').trim().toUpperCase();

  if (targetUpper === 'INR') {
    return {
      amount: parseFloat(numBase.toFixed(2)),
      currency: 'INR',
      rate_used: 1.000000,
    };
  }

  const rate = await getExchangeRate(targetUpper);
  const amount = parseFloat((numBase * rate).toFixed(2));

  return {
    amount,
    currency: targetUpper,
    rate_used: parseFloat(rate.toFixed(6)),
  };
}

module.exports = {
  getExchangeRate,
  convertToBase,
  convertFromBase,
};
