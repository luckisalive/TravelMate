const path = require('path');
const fs = require('fs');
const db = require('../../config/db');

async function fetchRates() {
  const url = 'https://api.frankfurter.dev/v1/latest?base=INR';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Frankfurter API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      base: data.base || 'INR',
      date: data.date,
      rates: data.rates,
      source: 'Frankfurter Live API',
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[seedExchangeRates] Live fetch failed (${err.message}). Using offline fallback fixture.`);
    const fallbackPath = path.join(__dirname, '../fixtures/fallbackRates.json');
    const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    return {
      base: fallbackData.base || 'INR',
      date: fallbackData.date || new Date().toISOString().split('T')[0],
      rates: fallbackData.rates,
      source: 'Offline Fallback Fixture',
    };
  }
}

async function seedExchangeRates() {
  console.log('[seedExchangeRates] Fetching exchange rates...');
  const { base, date, rates, source } = await fetchRates();

  // Ensure self-rate INR -> INR = 1.0 is present
  const allRates = { ...rates, [base]: 1.0 };

  // Pegged currency support (AED pegged to USD at 3.6725)
  if (!allRates.AED && allRates.USD) {
    allRates.AED = parseFloat((allRates.USD * 3.6725).toFixed(6));
  }

  const entries = Object.entries(allRates);

  let insertedCount = 0;
  for (const [currency, rate] of entries) {
    const query = `
      INSERT INTO exchange_rates (base, currency, rate, rate_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (base, currency, rate_date)
      DO UPDATE SET rate = EXCLUDED.rate;
    `;
    await db.query(query, [base, currency.toUpperCase(), parseFloat(rate), date]);
    insertedCount++;
  }

  console.log(`[seedExchangeRates] Successfully seeded ${insertedCount} currency rates for base ${base} on ${date} (Source: ${source}).`);
  return { insertedCount, base, date, source };
}

if (require.main === module) {
  seedExchangeRates()
    .then(() => db.pool.end())
    .catch((err) => {
      console.error('[seedExchangeRates] Error:', err);
      db.pool.end();
      process.exit(1);
    });
}

module.exports = seedExchangeRates;
