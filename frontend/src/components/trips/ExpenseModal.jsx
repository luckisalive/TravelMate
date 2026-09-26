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
  FileText,
  Users,
  Divide,
  UserCheck,
  Percent,
  SlidersHorizontal,
  Check
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
  
  // Splitting state
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'custom' | 'none'
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [customSplits, setCustomSplits] = useState({}); // { [userId]: amount }
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ensure all trip members are included (creator + companions)
  const allMembers = React.useMemo(() => {
    const list = [...members];
    if (user && !list.some((m) => m.user_id === user.id)) {
      list.unshift({ user_id: user.id, name: `${user.name} (You)`, email: user.email });
    }
    return list;
  }, [members, user]);

  useEffect(() => {
    if (initialExpense) {
      setCategory(initialExpense.category || 'Food');
      setAmount(initialExpense.amount ? initialExpense.amount.toString() : '');
      setCurrency(initialExpense.currency || 'INR');
      setDate(initialExpense.date ? initialExpense.date.split('T')[0] : '');
      setNote(initialExpense.note || '');
      setPaidBy(initialExpense.paid_by ? initialExpense.paid_by.toString() : (user?.id ? user.id.toString() : ''));

      // Populate splits from existing expense
      if (initialExpense.splits && initialExpense.splits.length > 0) {
        const type = initialExpense.split_type || 'equal';
        setSplitType(type);
        const splitIds = initialExpense.splits.map((s) => s.user_id);
        setSelectedMemberIds(splitIds);

        const customMap = {};
        for (const s of initialExpense.splits) {
          customMap[s.user_id] = s.amount_owed.toString();
        }
        setCustomSplits(customMap);
      } else {
        setSplitType(initialExpense.split_type || 'none');
        setSelectedMemberIds(allMembers.map((m) => m.user_id));
      }
    } else {
      setCategory('Food');
      setAmount('');
      setCurrency(displayCurrency || 'INR');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setPaidBy(user?.id ? user.id.toString() : '');
      setSplitType(allMembers.length > 1 ? 'equal' : 'none');
      setSelectedMemberIds(allMembers.map((m) => m.user_id));
      setCustomSplits({});
    }
    setError(null);
  }, [initialExpense, isOpen, displayCurrency, user, allMembers]);

  if (!isOpen) return null;

  // Live conversion estimation
  const numAmount = parseFloat(amount) || 0;
  let estimatedBaseINR = numAmount;
  if (currency !== 'INR' && rates[currency] && rates[currency] > 0) {
    estimatedBaseINR = parseFloat((numAmount / rates[currency]).toFixed(2));
  }

  // Equal split calculation
  const numSelected = selectedMemberIds.length;
  const equalShare = numSelected > 0 && numAmount > 0 ? (numAmount / numSelected).toFixed(2) : '0.00';

  // Custom split calculation & remaining balance
  const customSum = Object.entries(customSplits).reduce((sum, [uId, val]) => {
    if (selectedMemberIds.includes(parseInt(uId, 10))) {
      return sum + (parseFloat(val) || 0);
    }
    return sum;
  }, 0);
  const customRemaining = parseFloat((numAmount - customSum).toFixed(2));

  const toggleMemberSelection = (uId) => {
    if (selectedMemberIds.includes(uId)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((id) => id !== uId));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, uId]);
    }
  };

  const handleCustomAmountChange = (uId, val) => {
    setCustomSplits((prev) => ({
      ...prev,
      [uId]: val,
    }));
  };

  const handleAutoDistributeRemaining = () => {
    if (selectedMemberIds.length === 0 || numAmount <= 0) return;
    const baseShare = (numAmount / selectedMemberIds.length).toFixed(2);
    const newCustom = {};
    selectedMemberIds.forEach((id) => {
      newCustom[id] = baseShare;
    });
    setCustomSplits(newCustom);
  };

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

    if (splitType === 'equal' && selectedMemberIds.length === 0) {
      setError('Please select at least one person to split this expense with.');
      return;
    }

    if (splitType === 'custom') {
      if (selectedMemberIds.length === 0) {
        setError('Please select at least one person for custom split.');
        return;
      }
      if (Math.abs(customRemaining) > 0.05) {
        setError(`Custom split amounts must equal the total amount (${currency} ${parsedAmount.toFixed(2)}). Remaining: ${currency} ${customRemaining.toFixed(2)}`);
        return;
      }
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
        split_type: splitType,
      };

      if (splitType === 'equal') {
        payload.split_members = selectedMemberIds;
      } else if (splitType === 'custom') {
        payload.splits = selectedMemberIds.map((id) => ({
          user_id: id,
          amount_owed: parseFloat(parseFloat(customSplits[id] || 0).toFixed(2)),
        }));
      }

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
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
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
              Record payments, dining, activities, and split costs fairly among members.
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
          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Expense Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className="text-[11px] leading-tight truncate w-full">{cat.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount
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
                  {allMembers
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

          {/* SPLIT EXPENSE SECTION (Phase 7) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Split Allocation</span>
              </label>

              {splitType === 'equal' && numAmount > 0 && numSelected > 0 && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {currency} {equalShare} / person
                </span>
              )}
            </div>

            {/* Split Type Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  splitType === 'equal'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Divide className="w-3.5 h-3.5" />
                <span>Equal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitType('custom');
                  if (Object.keys(customSplits).length === 0) {
                    handleAutoDistributeRemaining();
                  }
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  splitType === 'custom'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Custom</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitType('none')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  splitType === 'none'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Personal</span>
              </button>
            </div>

            {/* Split Type Content: EQUAL */}
            {splitType === 'equal' && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Who was part of this expense?</span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds(allMembers.map((m) => m.user_id))}
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([parseInt(paidBy || user?.id, 10)])}
                      className="text-slate-500 hover:underline"
                    >
                      Payer Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allMembers.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.user_id);
                    return (
                      <div
                        key={m.user_id}
                        onClick={() => toggleMemberSelection(m.user_id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isSelected
                            ? 'bg-white border-indigo-200 text-slate-800 shadow-2xs font-semibold'
                            : 'bg-slate-100/60 border-transparent text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3" /> : m.name.charAt(0)}
                          </div>
                          <span className="truncate">{m.name}</span>
                        </div>
                        {isSelected && numAmount > 0 && (
                          <span className="text-slate-500 text-[11px] font-mono">
                            {currency} {equalShare}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Split Type Content: CUSTOM */}
            {splitType === 'custom' && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Custom breakdown per member:</span>
                  <button
                    type="button"
                    onClick={handleAutoDistributeRemaining}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    Distribute Evenly
                  </button>
                </div>

                <div className="space-y-2">
                  {allMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] shrink-0 font-bold">
                          {m.name.charAt(0)}
                        </div>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-slate-400 font-mono">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={customSplits[m.user_id] ?? ''}
                          onChange={(e) => handleCustomAmountChange(m.user_id, e.target.value)}
                          placeholder="0.00"
                          className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Remaining Balance Tracker */}
                <div className="pt-2 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Allocation Balance:</span>
                  {Math.abs(customRemaining) <= 0.05 ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Exact Match ({currency} {numAmount.toFixed(2)})
                    </span>
                  ) : customRemaining > 0 ? (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {currency} {customRemaining.toFixed(2)} remaining to allocate
                    </span>
                  ) : (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      Exceeds total by {currency} {Math.abs(customRemaining).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Split Type Content: PERSONAL */}
            {splitType === 'none' && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>This expense will be treated as personal for the payer only. No group debts will be created.</span>
              </div>
            )}
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
