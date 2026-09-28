import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  Users, 
  Search, 
  Receipt, 
  Utensils, 
  Car, 
  Hotel, 
  Compass, 
  ShoppingBag, 
  MoreHorizontal, 
  PieChart as PieIcon,
  BarChart3,
  UserPlus,
  Building2,
  Plane,
  X,
  UserCheck,
  Calculator
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ExpenseModal from './ExpenseModal';
import TripModal from './TripModal';
import TripBalancesView from './TripBalancesView';
import ItineraryView from '../itinerary/ItineraryView';
import CostEstimatorModal from '../estimator/CostEstimatorModal';
import { TripDetailSkeleton } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

const CATEGORY_COLORS = {
  Food: '#F59E0B',       // Amber
  Transport: '#0EA5E9',  // Sky
  Stay: '#8B5CF6',       // Purple
  Activity: '#10B981',   // Emerald
  Shopping: '#EC4899',   // Pink
  Other: '#64748B',      // Slate
};

const CATEGORY_ICONS = {
  Food: Utensils,
  Transport: Car,
  Stay: Hotel,
  Activity: Compass,
  Shopping: ShoppingBag,
  Other: MoreHorizontal,
};

export default function TripDetailView({ tripId, onBack, onNavigateToBookings }) {
  const { user } = useAuth();
  const toast = useToast();
  const { formatPrice, displayCurrency } = useCurrency();

  const [trip, setTrip] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses' | 'bookings' | 'members'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editTripModalOpen, setEditTripModalOpen] = useState(false);
  const [estimatorModalOpen, setEstimatorModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tripRes, analyticsRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/trips/${tripId}/expenses/analytics`),
      ]);

      if (tripRes.data?.success) {
        setTrip(tripRes.data.data);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load trip details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId]);

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
      toast.success('Expense deleted successfully');
      fetchTripDetails();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete expense.');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      setInviteError(null);
      setInviteSuccess(null);

      const res = await api.post(`/trips/${tripId}/members`, {
        email: inviteEmail.trim(),
        role: 'member',
      });

      if (res.data?.success) {
        const msg = res.data.message || 'Companion added successfully!';
        setInviteSuccess(msg);
        toast.success(msg);
        setInviteEmail('');
        fetchTripDetails();
        setTimeout(() => setInviteModalOpen(false), 1200);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to add companion.';
      setInviteError(msg);
      toast.error(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this companion from the trip?')) return;
    try {
      await api.delete(`/trips/${tripId}/members/${targetUserId}`);
      toast.success('Companion removed from trip');
      fetchTripDetails();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove member.');
    }
  };

  if (loading) {
    return <TripDetailSkeleton />;
  }

  if (error || !trip) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-red-700">{error || 'Trip not found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trips</span>
        </button>
      </div>
    );
  }

  // Filtered expenses
  const filteredExpenses = (trip.expenses || []).filter((exp) => {
    const matchesCategory = categoryFilter === 'ALL' || exp.category.toUpperCase() === categoryFilter.toUpperCase();
    const matchesSearch = !searchQuery.trim() || 
      (exp.note && exp.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.paid_by_name && exp.paid_by_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isOwner = trip.created_by === user?.id || trip.user_role === 'owner';

  // Budget calculations
  const budget = trip.summary?.total_budget || 0;
  const totalSpentBase = trip.summary?.total_spent_base || 0;
  const remainingBudgetBase = trip.summary?.remaining_budget !== undefined ? trip.summary.remaining_budget : (budget - totalSpentBase);
  const utilizationPct = trip.summary?.budget_utilization_pct || 0;
  const isOverBudget = trip.summary?.is_over_budget;

  // Prepare Recharts Donut data
  const pieData = (analytics?.categories || []).map((cat) => ({
    name: cat.category,
    value: cat.amount_base,
    percentage: cat.percentage,
    count: cat.count,
    color: CATEGORY_COLORS[cat.category] || '#64748B',
  }));

  // Daily trend data
  const trendData = (analytics?.daily_trend || []).map((item) => ({
    date: item.date.slice(5), // 'MM-DD'
    amount: item.amount_base,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Trip Header */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Trips</span>
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 uppercase tracking-wider">
                {trip.user_role === 'owner' ? 'Trip Owner' : 'Companion Member'}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                isOverBudget
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900'
              }`}>
                {isOverBudget ? 'Over Budget' : 'On Track'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {trip.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {trip.start_date.split('T')[0]} to {trip.end_date.split('T')[0]}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {trip.members?.length || 1} {trip.members?.length === 1 ? 'traveler' : 'travelers'}
              </span>
              <span>•</span>
              <span>Trip Base: {trip.base_currency}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setEditingExpense(null);
                setExpenseModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>

            <button
              onClick={() => setEstimatorModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-semibold text-xs shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
              title="Estimate Trip Budget"
            >
              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cost Estimator</span>
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-xs shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Add Companion</span>
                </button>

                <button
                  onClick={() => setEditTripModalOpen(true)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer"
                  title="Edit Trip Settings"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Financial Metrics Cards (Dual-Currency Display) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Budget */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Budget
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {formatPrice(budget).formatted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {formatPrice(budget).fullDisplay}
          </p>
        </div>

        {/* Card 2: Total Spent */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Spent
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {formatPrice(totalSpentBase).formatted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {formatPrice(totalSpentBase).fullDisplay}
          </p>
        </div>

        {/* Card 3: Remaining */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {remainingBudgetBase >= 0 ? 'Remaining Budget' : 'Deficit / Over Budget'}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              remainingBudgetBase >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              {remainingBudgetBase >= 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black ${
            remainingBudgetBase >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatPrice(Math.abs(remainingBudgetBase)).formatted}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {remainingBudgetBase >= 0 ? 'Available for spending' : 'Exceeded allocated budget'}
          </p>
        </div>

        {/* Card 4: Utilization */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Budget Utilization
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              utilizationPct > 100
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                : utilizationPct > 80
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            }`}>
              {utilizationPct}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilizationPct > 100
                  ? 'bg-rose-600'
                  : utilizationPct > 80
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, utilizationPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <span>Expenses: {formatPrice(trip.summary?.total_expenses_base || 0).formatted}</span>
            <span>Bookings: {formatPrice(trip.summary?.total_bookings_base || 0).formatted}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donut Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Spending by Category</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Breakdown of on-trip logged expenses</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              {pieData.length} categories
            </span>
          </div>

          {pieData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name) => [
                      formatPrice(value).formatted,
                      name,
                    ]}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
              <Receipt className="w-8 h-8 stroke-1" />
              <p className="text-xs">No expenses recorded yet</p>
            </div>
          )}
        </div>

        {/* Chart 2: Daily Spending Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span>Daily Spending Timeline</span>
              </h3>
              <p className="text-[11px] text-slate-500">Expenditure tracking across trip duration</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Base Currency: {displayCurrency}
            </span>
          </div>

          {trendData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <RechartsTooltip
                    formatter={(val) => [formatPrice(val).formatted, 'Spent']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar dataKey="amount" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
              <Calendar className="w-8 h-8 stroke-1" />
              <p className="text-xs">Daily timeline will render as expenses are logged</p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Nav Tabs: Expenses, Bookings, Companions */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto whitespace-nowrap pb-0.5">
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'expenses'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Logged Expenses</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {trip.expenses?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('bookings')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'bookings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Trip Bookings</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {trip.bookings?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('itinerary')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'itinerary'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>Itinerary</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Plan
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('balances')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'balances'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>Balances & Debt</span>
              {trip.members?.length > 1 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Split
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('members')}
            className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'members'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Companions</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {trip.members?.length || 1}
            </span>
          </button>
        </div>

        {/* SUBTAB 1: EXPENSES */}
        {activeSubTab === 'expenses' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {['ALL', 'Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes or payers..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Expenses List */}
            {filteredExpenses.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredExpenses.map((exp) => {
                  const IconComp = CATEGORY_ICONS[exp.category] || MoreHorizontal;
                  const catColor = CATEGORY_COLORS[exp.category] || '#64748B';
                  const canEdit = isOwner || exp.paid_by === user?.id;

                  return (
                    <div
                      key={exp.id}
                      className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                              style={{ backgroundColor: `${catColor}20`, color: catColor }}
                            >
                              {exp.category}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {exp.date}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                            {exp.note || `${exp.category} expense`}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>Paid by:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {exp.paid_by === user?.id ? 'You' : exp.paid_by_name}
                            </span>
                            {exp.splits && exp.splits.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                                  <Users className="w-3 h-3" />
                                  <span>
                                    Split ({exp.split_type === 'equal' ? 'Equal' : 'Custom'} · {exp.splits.length} {exp.splits.length === 1 ? 'person' : 'people'})
                                  </span>
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Amounts & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {exp.currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {exp.currency !== 'INR' && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              ≈ {formatPrice(exp.amount_base).formatted}
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setExpenseModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit expense"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                showIllustration={true}
                badge={searchQuery || categoryFilter !== 'ALL' ? 'No Matches' : 'No Expenses'}
                title={searchQuery || categoryFilter !== 'ALL' ? 'No matching expenses found' : 'No expenses recorded yet'}
                description={
                  searchQuery || categoryFilter !== 'ALL'
                    ? 'Try clearing your search query or switching your category filter back to "All Categories".'
                    : 'Track your spending on food, stay, rides, and activities with dual-currency conversions and group splits.'
                }
                action={{
                  label: 'Log Expense',
                  icon: Plus,
                  onClick: () => {
                    setEditingExpense(null);
                    setExpenseModalOpen(true);
                  },
                }}
              />
            )}
          </div>
        )}

        {/* SUBTAB 2: BOOKINGS */}
        {activeSubTab === 'bookings' && (
          <div className="space-y-3">
            {trip.bookings && trip.bookings.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {trip.bookings.map((booking) => {
                  const isHotel = booking.hotel_id !== null;
                  return (
                    <div
                      key={booking.id}
                      className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isHotel ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isHotel ? <Building2 className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                              {isHotel ? 'Hotel Stay' : booking.transport_mode?.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              booking.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {isHotel ? booking.hotel_name : `${booking.transport_operator} (${booking.transport_number})`}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isHotel
                              ? `${booking.hotel_city} • Check-in: ${booking.check_in} to ${booking.check_out}`
                              : `${booking.transport_origin} → ${booking.transport_destination} ${booking.seat_no ? `• Seat ${booking.seat_no}` : ''}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {formatPrice(booking.amount_base).formatted}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Pre-paid Booking
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                showIllustration={true}
                badge="Pre-paid Bookings"
                title="No bookings linked to this trip"
                description="When you reserve verified hotels, flights, or trains, you can link them to this trip to automatically track reservations against your budget."
                action={
                  onNavigateToBookings
                    ? {
                        label: 'View Reservations',
                        icon: Ticket,
                        onClick: onNavigateToBookings,
                      }
                    : null
                }
              />
            )}
          </div>
        )}

        {/* SUBTAB 3: COMPANIONS */}
        {activeSubTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Trip Companions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Travel buddies who can log and split trip expenses</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Companion</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(trip.members || []).map((m) => (
                <div
                  key={m.user_id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.user_id === user?.id && (
                          <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {m.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.role === 'owner' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {m.role}
                    </span>

                    {isOwner && m.user_id !== trip.created_by && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: BALANCES & DEBT */}
        {activeSubTab === 'balances' && (
          <TripBalancesView
            tripId={tripId}
            trip={trip}
            onRefreshTrip={fetchTripDetails}
          />
        )}

        {/* SUBTAB 5: DAY-WISE ITINERARY */}
        {activeSubTab === 'itinerary' && (
          <ItineraryView tripId={tripId} />
        )}
      </div>

      {/* MODALS */}
      {estimatorModalOpen && (
        <CostEstimatorModal
          isOpen={estimatorModalOpen}
          onClose={() => setEstimatorModalOpen(false)}
          tripId={tripId}
          initialBudget={trip?.budget}
          initialDays={trip?.duration_days}
        />
      )}

      {expenseModalOpen && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSaved={() => fetchTripDetails()}
          tripId={tripId}
          members={trip.members || []}
          initialExpense={editingExpense}
        />
      )}

      {editTripModalOpen && (
        <TripModal
          isOpen={editTripModalOpen}
          onClose={() => setEditTripModalOpen(false)}
          onSaved={() => fetchTripDetails()}
          initialTrip={trip}
        />
      )}

      {/* Invite Companion Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Trip Companion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Invite a travel companion by email</p>
              </div>
            </div>

            {inviteSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Companion Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="companion@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Companion must already have a registered TravelMate account.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {inviteLoading ? 'Adding...' : 'Add Companion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
