import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ActivityModal({
  isOpen,
  onClose,
  tripId,
  totalDays = 5,
  initialDay = 1,
  activity = null, // if editing
  onSaved,
}) {
  const toast = useToast();
  if (!isOpen) return null;

  const [dayNumber, setDayNumber] = useState(activity ? activity.day_number : initialDay || 1);
  const [time, setTime] = useState(activity?.time || '');
  const [title, setTitle] = useState(activity?.title || '');
  const [notes, setNotes] = useState(activity?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activity) {
      setDayNumber(activity.day_number);
      setTime(activity.time || '');
      setTitle(activity.title || '');
      setNotes(activity.notes || '');
    } else {
      setDayNumber(initialDay || 1);
      setTime('');
      setTitle('');
      setNotes('');
    }
  }, [activity, initialDay]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this activity.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let res;
      if (activity) {
        res = await api.put(`/trips/${tripId}/itinerary/${activity.id}`, {
          day_number: parseInt(dayNumber, 10),
          time: time || null,
          title: title.trim(),
          notes: notes.trim(),
        });
      } else {
        res = await api.post(`/trips/${tripId}/itinerary`, {
          day_number: parseInt(dayNumber, 10),
          time: time || null,
          title: title.trim(),
          notes: notes.trim(),
        });
      }

      if (res.data.success) {
        toast.success(activity ? 'Activity updated successfully!' : 'Activity added to itinerary!');
        if (onSaved) onSaved(res.data.data);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save activity.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base sm:text-lg">
              {activity ? 'Edit Itinerary Activity' : 'Add Itinerary Activity'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Day & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Trip Day
              </label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(parseInt(e.target.value, 10))}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {Array.from({ length: Math.max(totalDays, dayNumber) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Time (Optional)
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Scuba diving at Grand Island, Sunset dinner at Curlies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes & Reminders (Optional)
            </label>
            <textarea
              placeholder="Meeting point, what to carry, booking voucher codes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {activity ? 'Update Activity' : 'Add to Itinerary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
