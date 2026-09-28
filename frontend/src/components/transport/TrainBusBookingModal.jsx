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
  Clock
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function TrainBusBookingModal({ isOpen, onClose, transport, onBookingSuccess, onOpenAuth }) {
  const { user } = useAuth();
  const toast = useToast();
  const { displayCurrency, formatPrice } = useCurrency();

  const [passengerName, setPassengerName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (user?.name && !passengerName) {
      setPassengerName(user.name);
    }
  }, [user]);

  if (!isOpen || !transport) return null;

  const isTrain = transport.mode === 'train';
  const ModeIcon = isTrain ? Train : Bus;
  const priceInfo = formatPrice(transport.price);

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

  const handleConfirmReservation = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        transport_id: transport.id,
        passenger_name: passengerName.trim() || user.name,
        currency: displayCurrency,
      };

      const res = await api.post('/bookings/transport', payload);

      if (res.data?.success) {
        toast.success(`${isTrain ? 'Train ticket' : 'Bus ticket'} reserved! PNR #${res.data.data.booking.reference_code}`);
        onBookingSuccess(res.data.data);
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

        <div className="p-6 space-y-5">
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

          {/* Passenger Form */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Passenger Name
            </label>
            <input
              type="text"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder="Enter traveler name"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Ticket and e-voucher will be issued under this name.
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Standard Base Fare</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{priceInfo.formatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Reservation & Platform Charges</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Included</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-baseline justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Total Amount</span>
              <div className="text-right">
                <div className="font-extrabold text-lg text-slate-900 dark:text-white">
                  {priceInfo.formatted}
                </div>
                {priceInfo.secondary && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {priceInfo.secondary}
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
                <span>Confirm & Issue Ticket</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
