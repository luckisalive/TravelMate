import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Receipt,
  Ticket
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import TripModal from './TripModal';
import { TripsGridSkeleton } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

export default function TripsListView({ onSelectTrip, onExploreBookings }) {
  const { user } = useAuth();
  const toast = useToast();
  const { formatPrice } = useCurrency();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/trips');
      if (res.data?.success) {
        setTrips(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip and its logged expenses?')) return;
    try {
      await api.delete(`/trips/${tripId}`);
      toast.success('Trip deleted successfully');
      fetchTrips();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete trip.');
    }
  };

  const handleEditTrip = (e, trip) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual-Currency Expense & Budget Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Trips & Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Track spending against allocated budgets, auto-convert multi-currency expenses, and analyze spending breakdowns.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTrip(null);
            setCreateModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Trip</span>
        </button>
      </div>

      {loading ? (
        <TripsGridSkeleton count={6} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-xs text-red-700">
          {error}
        </div>
      ) : trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const isOwner = trip.created_by === user?.id || trip.role === 'owner';
            const budget = trip.budget || 0;
            const spent = trip.total_spent_base || 0;
            const remaining = trip.remaining_budget;
            const utilization = trip.budget_utilization_pct || 0;
            const isOverBudget = trip.is_over_budget;

            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group hover:-translate-y-0.5"
              >
                {/* Card Top */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        trip.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trip.status === 'upcoming'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {trip.status}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {trip.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEditTrip(e, trip)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit trip"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTrip(e, trip.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {trip.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.start_date} to {trip.end_date}</span>
                      <span>•</span>
                      <span className="text-indigo-600">{trip.duration_days} days</span>
                    </p>
                  </div>

                  {/* Financial Progress Bar */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Budget Spent:</span>
                      <span className={`font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatPrice(spent).formatted} / {formatPrice(budget).formatted}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget
                            ? 'bg-rose-600'
                            : utilization > 80
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{utilization}% used</span>
                      <span className={remaining < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                        {remaining >= 0 ? `${formatPrice(remaining).formatted} left` : 'Over budget'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom / Footer */}
                <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.expense_count} {trip.expense_count === 1 ? 'expense' : 'expenses'}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Ticket className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.booking_count} {trip.booking_count === 1 ? 'booking' : 'bookings'}</span>
                    </span>
                  </div>

                  <span className="text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs">
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          showIllustration={true}
          badge="No Trips Found"
          title="No Trips Created Yet"
          description="Create your first trip to start setting budgets, logging expenses with real-time currency conversions, and visualizing analytics."
          action={{
            label: 'Create First Trip',
            icon: Plus,
            onClick: () => {
              setEditingTrip(null);
              setCreateModalOpen(true);
            },
          }}
        />
      )}

      {/* Modal */}
      {createModalOpen && (
        <TripModal
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingTrip(null);
          }}
          onSaved={() => fetchTrips()}
          initialTrip={editingTrip}
        />
      )}
    </div>
  );
}
