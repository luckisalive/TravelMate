import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (Indian Rupee)' },
  { code: 'USD', symbol: '$', label: 'USD (US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR (Euro)' },
  { code: 'GBP', symbol: '£', label: 'GBP (British Pound)' },
  { code: 'AED', symbol: 'AED ', label: 'AED (UAE Dirham)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (Australian Dollar)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (Canadian Dollar)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (Singapore Dollar)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (Japanese Yen)' },
];

export function CurrencyProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [rates, setRates] = useState({ INR: 1.0 });
  const [rateDate, setRateDate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default display currency from user preference or INR
  const [displayCurrency, setDisplayCurrency] = useState(
    user?.display_currency || 'INR'
  );

  const homeCurrency = user?.currency_pref || 'INR';

  // Sync displayCurrency if user logs in or profile changes
  useEffect(() => {
    if (user?.display_currency) {
      setDisplayCurrency(user.display_currency);
    }
  }, [user?.display_currency]);

  // Fetch exchange rates from backend
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await api.get('/rates');
        if (res.data?.success && res.data.rates) {
          setRates(res.data.rates);
          setRateDate(res.data.date);
        }
      } catch (err) {
        console.warn('Failed to load exchange rates from API, using default INR = 1.0', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  // Change currency and optionally persist to user profile
  const setCurrency = async (newCurrency) => {
    setDisplayCurrency(newCurrency);
    if (user) {
      try {
        await updateProfile({ display_currency: newCurrency });
      } catch (err) {
        console.error('Failed to save display currency to profile:', err);
      }
    }
  };

  /**
   * Formats an amount given in base currency (INR).
   * Returns:
   *  - display: Primary formatted price with symbol (e.g. "$120.50" or "₹10,000")
   *  - home: Home currency price if display !== homeCurrency (e.g. "₹10,000")
   *  - fullDisplay: Combined string (e.g. "≈ $120.50 (₹10,000)" or "₹10,000")
   *  - isConverted: boolean
   *  - rateUsed: number
   */
  const formatPrice = (amountINR, targetCurrency = null) => {
    const numINR = parseFloat(amountINR) || 0;
    const targetCurr = (targetCurrency || displayCurrency).toUpperCase();
    const rate = rates[targetCurr] || (targetCurr === 'INR' ? 1.0 : 1.0);

    const targetMeta = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurr) || {
      symbol: targetCurr + ' ',
    };
    const homeMeta = SUPPORTED_CURRENCIES.find((c) => c.code === homeCurrency) || {
      symbol: homeCurrency + ' ',
    };

    const convertedAmount = numINR * rate;
    const isConverted = targetCurr !== 'INR';

    // Format target currency amount
    const formattedTarget = `${targetMeta.symbol}${convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: isConverted && targetCurr !== 'JPY' ? 2 : 0,
      maximumFractionDigits: isConverted && targetCurr !== 'JPY' ? 2 : 0,
    })}`;

    // Format home currency amount (INR)
    const formattedHome = `${homeMeta.symbol}${numINR.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

    let fullDisplay = formattedTarget;
    if (targetCurr !== homeCurrency) {
      fullDisplay = `≈ ${formattedTarget} (${formattedHome})`;
    }

    return {
      amount: convertedAmount,
      currency: targetCurr,
      symbol: targetMeta.symbol,
      formatted: formattedTarget,
      homeFormatted: formattedHome,
      fullDisplay,
      isConverted,
      rateUsed: rate,
      rateDate,
    };
  };

  const formatWithHome = (amountINR, targetCurrency = null) => {
    const result = formatPrice(amountINR, targetCurrency);
    return result.fullDisplay;
  };

  return (
    <CurrencyContext.Provider
      value={{
        displayCurrency,
        homeCurrency,
        setCurrency,
        formatPrice,
        formatWithHome,
        rates,
        rateDate,
        loading,
        supportedCurrencies: SUPPORTED_CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
