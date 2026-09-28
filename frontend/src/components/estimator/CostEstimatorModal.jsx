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
  const { formatWithHome } = useCurrency();

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
      setError(err.response?.data?.error?.message || 'Failed to calculate estimate.');
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-700/60 rounded-xl">
              <Calculator className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Trip Cost Estimator</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Smart Forecast
                </span>
              </div>
              <p className="text-indigo-200 text-xs">
                Compare multi-package predictions (Cheapest, Balanced, Comfort) against trip budget
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Controls Bar */}
          <form
            onSubmit={handleApplyParams}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Destination City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!!tripId}
                  className="w-full text-xs bg-white text-slate-800 font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Goa">Goa</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Jaipur">Jaipur</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  disabled={!!tripId}
                  className="w-full text-xs bg-white text-slate-800 font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Target Budget (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full text-xs bg-white text-slate-800 font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Origin (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BOM, DEL, BLR"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full text-xs bg-white text-slate-800 font-medium px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                />
              </div>
            </div>

            {/* Allowance Customization Toggle */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowCustomAllowances(!showCustomAllowances)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showCustomAllowances ? 'Hide Daily Allowances' : 'Customize Daily Allowances (Food, Local Transit, Activities)'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Recalculate Estimates
              </button>
            </div>

            {showCustomAllowances && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Cheapest Style Daily (₹)</span>
                  <input
                    type="number"
                    value={customAllowances.cheapest}
                    onChange={(e) => setCustomAllowances({ ...customAllowances, cheapest: e.target.value })}
                    className="w-full text-xs p-1.5 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Balanced Style Daily (₹)</span>
                  <input
                    type="number"
                    value={customAllowances.balanced}
                    onChange={(e) => setCustomAllowances({ ...customAllowances, balanced: e.target.value })}
                    className="w-full text-xs p-1.5 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Comfort Style Daily (₹)</span>
                  <input
                    type="number"
                    value={customAllowances.comfort}
                    onChange={(e) => setCustomAllowances({ ...customAllowances, comfort: e.target.value })}
                    className="w-full text-xs p-1.5 border rounded-lg mt-1"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Loading or Error State */}
          {loading && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
                        ? 'border-indigo-400/80 shadow-xl ring-2 ring-indigo-500/10 bg-gradient-to-b from-indigo-50/20 to-white'
                        : 'border-slate-200/90 shadow-md bg-white'
                    }`}
                  >
                    {/* Package Badge Header */}
                    <div
                      className={`p-5 rounded-t-3xl border-b ${
                        isBalanced
                          ? 'bg-indigo-600 text-white'
                          : isComfort
                          ? 'bg-slate-900 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-90">
                          {pkg.label}
                        </span>
                        {isBalanced && (
                          <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <h4 className="text-2xl font-black tracking-tight">
                        {formatWithHome(pkg.breakdown.total_estimate, 'INR')}
                      </h4>
                      <p className="text-xs opacity-85 mt-1 leading-snug">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Breakdown Details */}
                    <div className="p-5 space-y-4 flex-1 text-xs">
                      {/* Stay Pick */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            Accommodations ({pkg.breakdown.stay.nights} nights)
                          </span>
                          <span className="text-slate-800 font-bold">
                            {formatWithHome(pkg.breakdown.stay.total, 'INR')}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                          <p className="font-semibold text-slate-900 truncate">
                            {pkg.hotel.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatWithHome(pkg.hotel.price_per_night, 'INR')} / night
                          </p>
                        </div>
                      </div>

                      {/* Transit Pick */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Plane className="w-3.5 h-3.5 text-slate-400" />
                            Transit (Round-trip)
                          </span>
                          <span className="text-slate-800 font-bold">
                            {formatWithHome(pkg.breakdown.transport.total, 'INR')}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                          <p className="font-semibold text-slate-900 truncate">
                            {pkg.transport_outbound.operator ? `${pkg.transport_outbound.operator} ${pkg.transport_outbound.number}` : `${pkg.transport_outbound.mode} Transit`}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {pkg.transport_outbound.class ? `Class: ${pkg.transport_outbound.class}` : 'Scheduled corridor fare'}
                          </p>
                        </div>
                      </div>

                      {/* Daily Allowance */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-slate-400" />
                            Daily Allowance ({pkg.breakdown.allowance.days} days)
                          </span>
                          <span className="text-slate-800 font-bold">
                            {formatWithHome(pkg.breakdown.allowance.total, 'INR')}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                          <p className="font-semibold text-slate-900">
                            {formatWithHome(pkg.daily_allowance_rate, 'INR')} / day
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Food, intra-city transit, and ticketed entries
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Budget Comparison Card */}
                    <div className="p-5 border-t border-slate-100 bg-slate-50/60 rounded-b-3xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-500">vs Allocated Budget</span>
                        <span className={`font-bold flex items-center gap-1 ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isOver ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5" />
                              Over by {formatWithHome(Math.abs(pkg.budget_comparison.variance), 'INR')}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3.5 h-3.5" />
                              Under by {formatWithHome(pkg.budget_comparison.variance, 'INR')}
                            </>
                          )}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {budget > 0 && (
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, pkg.budget_comparison.budget_utilization_pct || 0)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{pkg.budget_comparison.budget_utilization_pct}% of budget</span>
                            <span>Target: {formatWithHome(budget, 'INR')}</span>
                          </div>
                        </div>
                      )}

                      {isOver && (
                        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] flex items-center gap-1.5 font-medium">
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
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-950">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Smart Budget Analysis:</strong> Predictions synthesize corridor transit fares, verified local accommodation price medians, and personalized daily activity allowances to generate comprehensive pre-trip forecasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
