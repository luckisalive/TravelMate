import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Building,
  Plane,
  Train,
  Bus,
  MapPin,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ActivityModal from './ActivityModal';
import { ItinerarySkeleton } from '../common/Skeletons';

export default function ItineraryView({ tripId }) {
  const toast = useToast();
  const [itineraryData, setItineraryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [error, setError] = useState('');

  const fetchItinerary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trips/${tripId}/itinerary`);
      if (res.data.success) {
        setItineraryData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load itinerary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchItinerary();
    }
  }, [tripId]);

  const handleSyncBookings = async () => {
    try {
      setSyncing(true);
      const res = await api.post(`/trips/${tripId}/itinerary/sync-bookings`);
      if (res.data.success) {
        toast.success(res.data.message || 'Bookings auto-linked to itinerary!');
        fetchItinerary();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to sync bookings.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this activity from the itinerary?')) return;

    try {
      const res = await api.delete(`/trips/${tripId}/itinerary/${itemId}`);
      if (res.data.success) {
        toast.success('Activity removed from itinerary');
        fetchItinerary();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete activity.');
    }
  };

  const handleMoveItem = async (dayItems, index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dayItems.length) return;

    // Swap positions
    const itemA = dayItems[index];
    const itemB = dayItems[targetIndex];

    const reorderedItems = [
      { id: itemA.id, day_number: itemA.day_number, position: targetIndex },
      { id: itemB.id, day_number: itemB.day_number, position: index },
    ];

    try {
      await api.post(`/trips/${tripId}/itinerary/reorder`, {
        items: reorderedItems,
      });
      fetchItinerary();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reorder activity.');
    }
  };

  if (loading) {
    return <ItinerarySkeleton />;
  }

  const items = itineraryData?.items || [];
  const totalDays = itineraryData?.total_days || 5;
  const unlinkedBookings = itineraryData?.unlinked_bookings || [];

  // Group items by day_number
  const itemsByDay = {};
  for (let d = 1; d <= totalDays; d++) {
    itemsByDay[d] = [];
  }
  for (const item of items) {
    if (!itemsByDay[item.day_number]) {
      itemsByDay[item.day_number] = [];
    }
    itemsByDay[item.day_number].push(item);
  }

  const currentDayItems = itemsByDay[activeDay] || [];

  const getActivityIcon = (item) => {
    if (item.booking?.hotel_id || item.title.toLowerCase().includes('check-in') || item.title.toLowerCase().includes('hotel')) {
      return <Building className="w-4 h-4 text-emerald-600" />;
    }
    if (item.booking?.transport_mode === 'flight' || item.title.toLowerCase().includes('flight')) {
      return <Plane className="w-4 h-4 text-blue-600" />;
    }
    if (item.booking?.transport_mode === 'train' || item.title.toLowerCase().includes('train')) {
      return <Train className="w-4 h-4 text-amber-600" />;
    }
    if (item.booking?.transport_mode === 'bus' || item.title.toLowerCase().includes('bus')) {
      return <Bus className="w-4 h-4 text-purple-600" />;
    }
    return <MapPin className="w-4 h-4 text-indigo-600" />;
  };

  return (
    <div className="space-y-6">

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Unlinked Bookings Banner */}
      {unlinkedBookings.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 via-indigo-100/60 to-purple-50 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950">
                Found {unlinkedBookings.length} unlinked reservation{unlinkedBookings.length > 1 ? 's' : ''}!
              </h4>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Automatically populate check-in times and transit departure schedules into your day-wise plan.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncBookings}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
            Auto-Link Reservations
          </button>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const count = (itemsByDay[day] || []).length;
            const isActive = activeDay === day;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Day {day}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setSelectedActivity(null);
            setIsActivityModalOpen(true);
          }}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Activity
        </button>
      </div>

      {/* Day Activities Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Day {activeDay} Schedule</span>
            <span className="text-xs font-normal text-slate-500">
              ({currentDayItems.length} planned activit{currentDayItems.length !== 1 ? 'ies' : 'y'})
            </span>
          </h3>
        </div>

        {currentDayItems.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-200/60 border-dashed">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-slate-700">No activities planned for Day {activeDay}</h4>
            <p className="text-[11px] text-slate-400 mt-1 mb-4">
              Add sightseeing, dining spots, or link existing bookings to keep your group aligned.
            </p>
            <button
              onClick={() => {
                setSelectedActivity(null);
                setIsActivityModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Activity to Day {activeDay}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {currentDayItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start justify-between gap-3 group"
              >
                {/* Left: Time & Content */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Time Badge */}
                  <div className="shrink-0 flex flex-col items-center">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      {item.time || 'Flexible'}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                    {getActivityIcon(item)}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {item.title}
                      </h4>
                      {item.booking_id && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <LinkIcon className="w-2.5 h-2.5" />
                          Linked Reservation #{item.booking_id}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Reorder & Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMoveItem(currentDayItems, idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveItem(currentDayItems, idx, 'down')}
                      disabled={idx === currentDayItems.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedActivity(item);
                      setIsActivityModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Edit Activity"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Activity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Add/Edit Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setSelectedActivity(null);
        }}
        tripId={tripId}
        totalDays={totalDays}
        initialDay={activeDay}
        activity={selectedActivity}
        onSaved={() => {
          showToast(selectedActivity ? 'Activity updated.' : 'Activity added to itinerary.');
          fetchItinerary();
        }}
      />
    </div>
  );
}
