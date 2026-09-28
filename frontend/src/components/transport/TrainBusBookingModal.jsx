import React, { useState, useEffect } from 'react';
import { 
  X, 
  Train, 
  Bus, 
  Check, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function TrainBusBookingModal({ isOpen, onClose, transport, onBookingSuccess, onOpenAuth }) {
  const { user } = useAuth();
  const toast = useToast();
  const { displayCurrency, formatPrice } = useCurrency();

  // Multi-passenger state
  const [passengers, setPassengers] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Trips state
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setPassengers([user.name]);
    } else {
      setPassengers(['']);
    }
  }, [user, isOpen]);

  // Load user trips when modal is open and authenticated
  useEffect(() => {
    if (isOpen && user) {
      async function loadTrips() {
        try {
          const res = await api.get('/trips');
          if (res.data?.success && Array.isArray(res.data.data)) {
            setTrips(res.data.data);
            if (res.data.data.length > 0) {
              setSelectedTripId(res.data.data[0].id.toString());
              setIsCreatingTrip(false);
            } else {
              setIsCreatingTrip(true);
              setNewTripName(`Trip to ${transport?.destination?.city || 'Destination'}`);
            }
          }
        } catch (err) {
          console.warn('Could not load user trips', err);
          setIsCreatingTrip(true);
          setNewTripName(`Trip to ${transport?.destination?.city || 'Destination'}`);
        }
      }
      loadTrips();
    }
  }, [isOpen, user, transport?.destination?.city]);

  if (!isOpen || !transport) return null;

  const isTrain = transport.mode === 'train';
  const ModeIcon = isTrain ? Train : Bus;
  const singlePrice = parseFloat(transport.price) || 0;
  const totalPrice = singlePrice * passengers.length;
  const singlePriceInfo = formatPrice(singlePrice);
  const totalPriceInfo = formatPrice(totalPrice);

  const departureDate = new Date(transport.departs_at).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const departureTime = new Date(transport.departs_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePassengerChange = (index, value) => {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddPassenger = () => {
    if (passengers.length >= 8) return;
    setPassengers((prev) => [...prev, '']);
  };

  const handleRemovePassenger = (index) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmReservation = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    // Validate that passengers have names
    const cleanedPassengers = passengers.map((p, idx) => ({
      name: p.trim() || (idx === 0 ? user.name : `Traveler ${idx + 1}`),
    }));

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        transport_id: transport.id,
        passengers: cleanedPassengers,
        currency: displayCurrency,
      };

      if (isCreatingTrip || !selectedTripId) {
        payload.new_trip_name = newTripName.trim() || `Trip to ${transport.destination?.city || 'Destination'} (${departureDate})`;
      } else {
        payload.trip_id = parseInt(selectedTripId, 10);
      }

      const res = await api.post('/bookings/transport', payload);

      if (res.data?.success) {
        const count = cleanedPassengers.length;
        const msg = `${count} ${isTrain ? 'train ticket(s)' : 'bus ticket(s)'} reserved!`;
        toast.success(msg);
        if (onBookingSuccess) {
          onBookingSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('Booking failed:', err);
      const errMsg = err.response?.data?.error?.message || 'Reservation failed. Please try again.';
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <ModeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base">{transport.operator}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                  {transport.number}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {transport.origin?.city} → {transport.destination?.city} • {transport.class}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Trip Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Journey Summary
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 dark:text-slate-100">{transport.origin?.name}</div>
                <div className="text-slate-500 dark:text-slate-400">{departureTime} • {departureDate}</div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="font-bold text-slate-800 dark:text-slate-100">{transport.destination?.name}</div>
                <div className="text-slate-500 dark:text-slate-400">Duration: {transport.duration_formatted}</div>
              </div>
            </div>
          </div>

          {/* Trip Selection */}
          {user && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Attach to Trip
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingTrip(!isCreatingTrip)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold cursor-pointer"
                >
                  {isCreatingTrip ? 'Select Existing Trip' : '+ Create New Trip'}
                </button>
              </div>

              {isCreatingTrip ? (
                <input
                  type="text"
                  placeholder="e.g. Goa Monsoon Vacation 2026"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {trips.length > 0 ? (
                    trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.start_date})
                      </option>
                    ))
                  ) : (
                    <option value="">No existing trips - new trip will be created</option>
                  )}
                </select>
              )}
            </div>
          )}

          {/* Travelers / Multi-Passenger Form */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Travelers ({passengers.length})
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddPassenger}
                disabled={passengers.length >= 8}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Traveler</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {passengers.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {idx === 0 ? 'Passenger 1 (Primary / Lead Traveler)' : `Passenger ${idx + 1}`}
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handlePassengerChange(idx, e.target.value)}
                      placeholder={idx === 0 ? 'Enter primary traveler name' : `Enter traveler ${idx + 1} name`}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePassenger(idx)}
                      className="mt-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Remove traveler"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              An individual verified ticket will be generated for each traveler.
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Fare per Ticket</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{singlePriceInfo.formatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Number of Travelers</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{passengers.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Reservation & Platform Charges</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Included</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-baseline justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Total Amount</span>
              <div className="text-right">
                <div className="font-extrabold text-lg text-slate-900 dark:text-white">
                  {totalPriceInfo.formatted}
                </div>
                {totalPriceInfo.secondary && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {totalPriceInfo.secondary}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmReservation}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Reservation...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  Confirm & Issue {passengers.length} {passengers.length === 1 ? 'Ticket' : 'Tickets'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
