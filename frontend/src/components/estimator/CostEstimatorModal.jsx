import React, { useState, useEffect } from 'react';
import {
  Calculator,
  X,
  Compass,
  Building,
  Plane,
  AlertTriangle,
  Sliders,
  Info,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';

export default function CostEstimatorModal({ isOpen, onClose, initialCity = 'Goa', tripId = null, initialBudget = 0, initialDays = 4 }) {
  const { formatWithHome, formatPrice } = useCurrency();
  const formatAmount = (val) => {
    if (typeof formatWithHome === 'function') return formatWithHome(val, 'INR');
    if (typeof formatPrice === 'function') {
      const res = formatPrice(val, 'INR');
      return res?.fullDisplay || res?.formatted || `₹${Number(val || 0).toLocaleString()}`;
    }
    return `₹${Number(val || 0).toLocaleString()}`;
  };

  const [city, setCity] = useState(initialCity || 'Goa');
  const [days, setDays] = useState(initialDays || 4);
  const [budget, setBudget] = useState(initialBudget || 30000);
  const [origin, setOrigin] = useState('');
  const [showCustomAllowances, setShowCustomAllowances] = useState(false);
  const [customAllowances, setCustomAllowances] = useState({
    cheapest: 800,
    balanced: 2000,
    comfort: 5000,
  });

  const [loading, setLoading] = useState(false);
  const [estimateData, setEstimateData] = useState(null);
  const [error, setError] = useState('');

  const fetchEstimate = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (tripId) {
        res = await api.post(`/trips/${tripId}/estimate`, {
          customAllowances: params.customAllowances || customAllowances,
        });
      } else {
        const queryCity = params.city !== undefined ? params.city : city;
        const queryOrigin = params.origin !== undefined ? params.origin : origin;
        const queryDays = params.days !== undefined ? params.days : days;
        const queryBudget = params.budget !== undefined ? params.budget : budget;
        const queryAllowances = params.customAllowances !== undefined ? params.customAllowances : customAllowances;

        res = await api.post('/estimator/estimate', {
          city: queryCity,
          origin: queryOrigin.trim() || undefined,
          days: parseInt(queryDays, 10) || 4,
          budget: parseFloat(queryBudget) || 0,
          customAllowances: queryAllowances,
        });
      }

      if (res.data.success) {
        setEstimateData(res.data.data);
        if (tripId && res.data.data) {
          if (res.data.data.destination_city) setCity(res.data.data.destination_city);
          if (res.data.data.days) setDays(res.data.data.days);
          if (res.data.data.budget !== undefined && res.data.data.budget !== null) setBudget(res.data.data.budget);
        }
      }
    } catch (err) {
      let errMsg = err.response?.data?.error?.message;
      if (!errMsg) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          errMsg = 'Server response timed out. The backend container may be waking up from free-tier sleep—please retry in a moment.';
        } else if (err.message === 'Network Error') {
          errMsg = 'Cannot reach backend server. The service may be spinning up from idle sleep—please wait a few seconds and retry.';
        } else {
          errMsg = err.message || 'Failed to calculate estimate.';
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const effectiveCity = initialCity || 'Goa';
    const effectiveDays = initialDays || 4;
    const effectiveBudget = initialBudget || 30000;

    setCity(effectiveCity);
    setDays(effectiveDays);
    setBudget(effectiveBudget);

    fetchEstimate({
      city: effectiveCity,
      days: effectiveDays,
      budget: effectiveBudget,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tripId, initialCity, initialBudget, initialDays]);

  const handleApplyParams = (e) => {
    e.preventDefault();
    fetchEstimate();
  };

  if (!isOpen) return null;

  const packages = estimateData?.packages;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Trip Cost Estimator</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                  Smart Forecast
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Compare multi-package predictions (Cheapest, Balanced, Comfort) against trip budget
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Controls Bar */}
          <form
            onSubmit={handleApplyParams}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Destination City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!!tripId}
                  className="w-full text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Goa">Goa</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Jaipur">Jaipur</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  disabled={!!tripId}
                  className="w-full text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Target Budget (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Origin (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BOM, DEL, BLR"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
            </div>

            {/* Allowance Customization Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowCustomAllowances(!showCustomAllowances)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showCustomAllowances ? 'Hide Daily Allowances' : 'Customize Daily Allowances (Food, Local Transit, Activities)'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Recalculate Estimates
              </button>
            </div>

            {showCustomAllowances && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Cheapest Style Daily (₹)</span>
                  <input
                    type="number"
                    value={customAllowances.cheapest}
                    onChange={(e) => setCustomAllowances({ ...customAllowances, cheapest: e.target.value })}
                    className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Balanced Style Daily (₹)</span>
                  <input
                    type="number"
                    value={customAllowances.balanced}
                    onChange={(e) => setCustomAllowances({ ...customAllowances, balanced: e.target.value })}
                    className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Comfort Style Daily (₹)</span>
                  <input
                    type="number"
                    value={customAllowances.comfort}
                    onChange={(e) => setCustomAllowances({ ...customAllowances, comfort: e.target.value })}
                    className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg mt-1"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Loading or Error State */}
          {loading && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs">Computing optimal packages over catalog fares and hotel rates...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Side-by-Side Packages */}
          {!loading && packages && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {['cheapest', 'balanced', 'comfort'].map((styleKey) => {
                const pkg = packages[styleKey];
                if (!pkg) return null;

                const isComfort = styleKey === 'comfort';
                const isBalanced = styleKey === 'balanced';
                const isOver = pkg.budget_comparison.is_over_budget;

                return (
                  <div
                    key={styleKey}
                    className={`rounded-3xl border transition-all flex flex-col ${
                      isBalanced
                        ? 'border-blue-500 dark:border-blue-600 shadow-lg ring-1 ring-blue-500/20 bg-white dark:bg-slate-900'
                        : 'border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900'
                    }`}
                  >
                    {/* Package Badge Header */}
                    <div
                      className={`p-5 rounded-t-3xl border-b ${
                        isBalanced
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isComfort
                          ? 'bg-slate-900 dark:bg-slate-950 text-white border-slate-800'
                          : 'bg-slate-800 text-white border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-90">
                          {pkg.label}
                        </span>
                        {isBalanced && (
                          <span className="bg-white/20 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <h4 className="text-2xl font-black tracking-tight">
                        {formatAmount(pkg.breakdown.total_estimate)}
                      </h4>
                      <p className="text-xs opacity-85 mt-1 leading-snug">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Breakdown Details */}
                    <div className="p-5 space-y-4 flex-1 text-xs">
                      {/* Stay Pick */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            Accommodations ({pkg.breakdown.stay.nights} nights)
                          </span>
                          <span className="text-slate-800 dark:text-slate-100 font-bold">
                            {formatAmount(pkg.breakdown.stay.total)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {pkg.hotel?.name || 'Selected Stay'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatAmount(pkg.hotel?.price_per_night || 0)} / night
                          </p>
                        </div>
                      </div>

                      {/* Transit Pick */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Plane className="w-3.5 h-3.5 text-slate-400" />
                            Transit (Round-trip)
                          </span>
                          <span className="text-slate-800 dark:text-slate-100 font-bold">
                            {formatAmount(pkg.breakdown.transport.total)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {pkg.transport_outbound?.operator ? `${pkg.transport_outbound.operator} ${pkg.transport_outbound.number}` : `${pkg.transport_outbound?.mode || 'Scheduled'} Transit`}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {pkg.transport_outbound?.class ? `Class: ${pkg.transport_outbound.class}` : 'Scheduled corridor fare'}
                          </p>
                        </div>
                      </div>

                      {/* Daily Allowance */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-slate-400" />
                            Daily Allowance ({pkg.breakdown.allowance.days} days)
                          </span>
                          <span className="text-slate-800 dark:text-slate-100 font-bold">
                            {formatAmount(pkg.breakdown.allowance.total)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {formatAmount(pkg.daily_allowance_rate)} / day
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Food, intra-city transit, and ticketed entries
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Budget Comparison Card */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 rounded-b-3xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-500 dark:text-slate-400">vs Allocated Budget</span>
                        <span className={`font-bold flex items-center gap-1 ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isOver ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5" />
                              Over by {formatAmount(Math.abs(pkg.budget_comparison?.variance || 0))}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3.5 h-3.5" />
                              Under by {formatAmount(pkg.budget_comparison?.variance || 0)}
                            </>
                          )}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {budget > 0 && (
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, pkg.budget_comparison?.budget_utilization_pct || 0)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{pkg.budget_comparison?.budget_utilization_pct || 0}% of budget</span>
                            <span>Target: {formatAmount(budget)}</span>
                          </div>
                        </div>
                      )}

                      {isOver && (
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-red-400 rounded-xl text-[11px] flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Warning: Exceeds target budget.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Budget Forecast Notice */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Smart Budget Analysis:</strong> Predictions synthesize corridor transit fares, verified local accommodation price medians, and personalized daily activity allowances to generate comprehensive pre-trip forecasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
