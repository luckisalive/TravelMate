import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Utensils, 
  Car, 
  Hotel, 
  Compass, 
  ShoppingBag, 
  MoreHorizontal, 
  Calendar, 
  User, 
  AlertCircle,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: Utensils, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Transport', label: 'Transport', icon: Car, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'Stay', label: 'Stay / Lodging', icon: Hotel, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'Activity', label: 'Activities & Tours', icon: Compass, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'Shopping', label: 'Shopping & Gifts', icon: ShoppingBag, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'Other', label: 'Other Expenses', icon: MoreHorizontal, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function ExpenseModal({
  isOpen,
  onClose,
  onSaved,
  tripId,
  members = [],
  initialExpense = null,
}) {
  const { supportedCurrencies, displayCurrency, rates } = useCurrency();
  const { user } = useAuth();

  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(displayCurrency || 'INR');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialExpense) {
      setCategory(initialExpense.category || 'Food');
      setAmount(initialExpense.amount ? initialExpense.amount.toString() : '');
      setCurrency(initialExpense.currency || 'INR');
      setDate(initialExpense.date ? initialExpense.date.split('T')[0] : '');
      setNote(initialExpense.note || '');
      setPaidBy(initialExpense.paid_by ? initialExpense.paid_by.toString() : (user?.id ? user.id.toString() : ''));
    } else {
      setCategory('Food');
      setAmount('');
      setCurrency(displayCurrency || 'INR');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setPaidBy(user?.id ? user.id.toString() : '');
    }
    setError(null);
  }, [initialExpense, isOpen, displayCurrency, user]);

  if (!isOpen) return null;

  // Live conversion estimation
  const numAmount = parseFloat(amount) || 0;
  let estimatedBaseINR = numAmount;
  if (currency !== 'INR' && rates[currency] && rates[currency] > 0) {
    estimatedBaseINR = parseFloat((numAmount / rates[currency]).toFixed(2));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!category) {
      setError('Please choose a category.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        category,
        amount: parsedAmount,
        currency,
        date: date || new Date().toISOString().split('T')[0],
        note: note.trim(),
        paid_by: paidBy ? parseInt(paidBy, 10) : user.id,
      };

      let res;
      if (initialExpense && initialExpense.id) {
        res = await api.put(`/trips/${tripId}/expenses/${initialExpense.id}`, payload);
      } else {
        res = await api.post(`/trips/${tripId}/expenses`, payload);
      }

      if (res.data?.success) {
        onSaved(res.data.data);
        onClose();
      } else {
        setError(res.data?.error?.message || 'Failed to save expense.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Error saving expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {initialExpense ? 'Edit Trip Expense' : 'Log Trip Expense'}
            </h2>
            <p className="text-xs text-slate-500">
              Record payments, dining, activities, and auto-convert to base currency.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Expense Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount Paid
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Dual-Currency Preview */}
          {currency !== 'INR' && numAmount > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span className="text-slate-500">Converted Base Value (INR):</span>
              <span className="font-bold text-indigo-700 font-mono">
                ≈ ₹{estimatedBaseINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Date & Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expense Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Paid By
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  <option value={user?.id}>{user?.name} (You)</option>
                  {members
                    .filter((m) => m.user_id !== user?.id)
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Seafood dinner with team, taxi fare to fort"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialExpense ? 'Update Expense' : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
