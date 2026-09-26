const db = require('../config/db');
const { invalidateCurrencyCache } = require('../utils/currency');

let fallbackData = null;
try {
  fallbackData = require('../db/fixtures/fallbackRates.json');
} catch (e) {
  // Ignore
}

/**
 * Fetch latest rates from Frankfurter Live API with fallback to static fixture.
 */
async function fetchFrankfurterRates() {
  const url = 'https://api.frankfurter.dev/v1/latest?base=INR';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Frankfurter API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      base: data.base || 'INR',
      date: data.date || new Date().toISOString().split('T')[0],
      rates: data.rates || {},
      source: 'Frankfurter Live API',
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[rateSyncService] Live Frankfurter fetch failed (${err.message}). Using offline fallback fixture.`);
    if (fallbackData && fallbackData.rates) {
      return {
        base: fallbackData.base || 'INR',
        date: fallbackData.date || new Date().toISOString().split('T')[0],
        rates: fallbackData.rates || {},
        source: 'Offline Fallback Fixture',
      };
    }
    return {
      base: 'INR',
      date: new Date().toISOString().split('T')[0],
      rates: { USD: 0.0119, EUR: 0.0108, GBP: 0.0092, AED: 0.0437, AUD: 0.0182, CAD: 0.0163, SGD: 0.0159, JPY: 1.8350 },
      source: 'Static Emergency Rates',
    };
  }
}

/**
 * Sync exchange rates to exchange_rates PostgreSQL table.
 * @returns {Promise<{ success: boolean, base: string, date: string, insertedCount: number, source: string }>}
 */
async function syncExchangeRates() {
  try {
    const { base, date, rates, source } = await fetchFrankfurterRates();

    // Ensure self-rate INR -> INR = 1.0 is present
    const allRates = { ...rates, [base]: 1.0 };

    // Pegged currency support (AED pegged to USD at 3.6725)
    if (!allRates.AED && allRates.USD) {
      allRates.AED = parseFloat((allRates.USD * 3.6725).toFixed(6));
    }

    let insertedCount = 0;
    for (const [currency, rate] of Object.entries(allRates)) {
      const query = `
        INSERT INTO exchange_rates (base, currency, rate, rate_date)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (base, currency, rate_date)
        DO UPDATE SET rate = EXCLUDED.rate;
      `;
      await db.query(query, [base, currency.toUpperCase(), parseFloat(rate), date]);
      insertedCount++;
    }

    invalidateCurrencyCache();
    console.log(`[rateSyncService] Synced ${insertedCount} exchange rates for ${base} on ${date} (Source: ${source}).`);
    return {
      success: true,
      base,
      date,
      insertedCount,
      source,
    };
  } catch (err) {
    console.error('[rateSyncService] Error during rate synchronization:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

let syncInterval = null;

/**
 * Starts background sync cron job (every 24 hours).
 */
function startRateSyncCron() {
  // Run once after slight boot delay (1.5s) to avoid race with server startup
  const initialTimer = setTimeout(() => {
    syncExchangeRates().catch((e) => console.warn('[rateSyncService] Initial sync error:', e.message));
  }, 1500);
  if (initialTimer.unref) initialTimer.unref();

  // Run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  syncInterval = setInterval(() => {
    console.log('[rateSyncService] Running daily scheduled exchange rate sync...');
    syncExchangeRates().catch((e) => console.warn('[rateSyncService] Cron sync error:', e.message));
  }, TWENTY_FOUR_HOURS);

  // Unref timer so Node process is not prevented from exiting during tests
  if (syncInterval.unref) {
    syncInterval.unref();
  }
}

function stopRateSyncCron() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

module.exports = {
  syncExchangeRates,
  startRateSyncCron,
  stopRateSyncCron,
};
