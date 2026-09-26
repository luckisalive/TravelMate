import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard,
  User,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';

export default function SettleUpModal({
  isOpen,
  onClose,
  onSettled,
  tripId,
  members = [],
  initialData = null,
  baseCurrency = 'INR',
}) {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [fromUser, setFromUser] = useState('');
  const [toUser, setToUser] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFromUser(initialData.from_user ? initialData.from_user.toString() : '');
      setToUser(initialData.to_user ? initialData.to_user.toString() : '');
      setAmount(initialData.amount ? initialData.amount.toString() : '');
    } else {
      // Default from_user to current user
      setFromUser(user?.id ? user.id.toString() : '');
      // Default to_user to first member other than current user
      const other = members.find((m) => m.user_id !== user?.id);
      setToUser(other ? other.user_id.toString() : '');
      setAmount('');
    }
    setError(null);
    setSuccess(null);
  }, [initialData, isOpen, user, members]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const fromId = parseInt(fromUser, 10);
    const toId = parseInt(toUser, 10);
    const parsedAmount = parseFloat(amount);

    if (isNaN(fromId) || isNaN(toId)) {
      setError('Please select both the paying and receiving members.');
      return;
    }

    if (fromId === toId) {
      setError('Payer and recipient cannot be the same member.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid settlement amount greater than 0.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/trips/${tripId}/settlements`, {
        from_user: fromId,
        to_user: toId,
        amount: parsedAmount,
      });

      if (res.data?.success) {
        setSuccess(res.data.message || 'Settlement recorded successfully!');
        if (onSettled) onSettled(res.data.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.data?.error?.message || 'Failed to record settlement.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Error recording settlement.');
    } finally {
      setLoading(false);
    }
  };

  const fromMember = members.find((m) => m.user_id === parseInt(fromUser, 10));
  const toMember = members.find((m) => m.user_id === parseInt(toUser, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Record Settlement</h2>
            <p className="text-xs text-slate-500">
              Settle outstanding group balances and record peer payment.
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Peer Payment Flow: Payer -> Receiver */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Who is paying? (Debtor)
              </label>
              <select
                value={fromUser}
                onChange={(e) => setFromUser(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              >
                <option value="">Select Payer...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name} {m.user_id === user?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center py-0.5 text-slate-400">
              <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Who receives payment? (Creditor)
              </label>
              <select
                value={toUser}
                onChange={(e) => setToUser(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              >
                <option value="">Select Recipient...</option>
                {members
                  .filter((m) => m.user_id.toString() !== fromUser)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} {m.user_id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Settlement Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Settlement Amount ({baseCurrency})
              </label>
              {initialData?.amount && (
                <button
                  type="button"
                  onClick={() => setAmount(initialData.amount.toString())}
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Use Suggested ({formatPrice(initialData.amount, baseCurrency).formatted})</span>
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold font-mono">
                {baseCurrency === 'INR' ? '₹' : baseCurrency}
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Summary Preview */}
          {fromMember && toMember && amount && parseFloat(amount) > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-900 flex items-center justify-between">
              <span>Transfer summary:</span>
              <span className="font-bold">
                {fromMember.name} pays {toMember.name} {formatPrice(parseFloat(amount), baseCurrency).formatted}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
