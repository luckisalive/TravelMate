import React, { useState } from 'react';
import { 
  X, 
  Plane, 
  Train, 
  Bus, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Loader2,
  Armchair
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function BoardingPassModal({ isOpen, onClose, booking, onCancellationSuccess }) {
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !booking) return null;

  const transport = booking.transport || {};
  const isFlight = transport.mode === 'flight';
  const isTrain = transport.mode === 'train';
  const isBus = transport.mode === 'bus';

  const ModeIcon = isFlight ? Plane : isTrain ? Train : Bus;

  const handlePrint = () => {
    window.print();
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    setErrorMsg(null);
    try {
      const res = await api.patch(`/bookings/${booking.id}/cancel`);
      if (res.data?.success) {
        toast.success(`Reservation ${booking.reference_code} cancelled successfully.`);
        if (onCancellationSuccess) {
          onCancellationSuccess(booking.id);
        }
        setCancelConfirmOpen(false);
        onClose();
      }
    } catch (err) {
      console.error('Cancel booking error:', err);
      const errMsg = err.response?.data?.error?.message || 'Failed to cancel reservation.';
      setErrorMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setCancelling(false);
    }
  };

  const departureDate = transport.departs_at
    ? new Date(transport.departs_at).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const departureTime = transport.departs_at
    ? new Date(transport.departs_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const arrivalDate = transport.arrives_at
    ? new Date(transport.arrives_at).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const arrivalTime = transport.arrives_at
    ? new Date(transport.arrives_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              TravelMate Verified E-Ticket
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCancelled 
                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isCancelled ? 'CANCELLED' : 'CONFIRMED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Print E-Ticket"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Boarding Pass / Ticket Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Main Ticket Container with Perforated Edge Effect */}
          <div className="relative bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800">
            {/* Background Watermark Icon */}
            <div className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 pointer-events-none">
              <ModeIcon className="w-full h-full" />
            </div>

            {/* Header: Operator & PNR */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <ModeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white leading-tight">
                    {transport.operator || 'Transport Service'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-blue-300 font-mono">
                      {transport.number}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                      {transport.class}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Ticket Reference / PNR
                </div>
                <div className="font-mono text-base font-extrabold text-blue-400 tracking-wider">
                  {booking.reference_code}
                </div>
              </div>
            </div>

            {/* Flight/Route Graphic: Origin -> Destination */}
            <div className="py-6 flex items-center justify-between">
              {/* Origin */}
              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {transport.origin?.code || 'ORIG'}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {transport.origin?.city || 'Origin City'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {departureTime} • {departureDate}
                </div>
              </div>

              {/* Transit Line / Arrow */}
              <div className="flex-1 px-4 flex flex-col items-center">
                <div className="text-[10px] font-semibold text-slate-400 mb-1">
                  {isFlight ? 'Non-Stop Flight' : isTrain ? 'Express Rail' : 'Direct Highway'}
                </div>
                <div className="w-full flex items-center">
                  <div className="h-0.5 flex-1 bg-slate-800 relative">
                    <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <ModeIcon className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  Dep: {transport.origin?.name?.substring(0, 24)}...
                </div>
              </div>

              {/* Destination */}
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {transport.destination?.code || 'DEST'}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {transport.destination?.city || 'Destination City'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {arrivalTime} • {arrivalDate}
                </div>
              </div>
            </div>

            {/* Passenger & Seat Badges (Notched Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-800/60 rounded-2xl p-4 border border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Passenger</div>
                <div className="text-xs font-bold text-white mt-0.5 truncate">
                  {booking.passenger_name || 'Traveler'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Assigned Seat</div>
                <div className="text-xs font-extrabold text-blue-400 mt-0.5 flex items-center gap-1">
                  <Armchair className="w-3.5 h-3.5" />
                  <span>{booking.seat_no || transport.seat_no || 'Standard'}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Class</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {transport.class || 'Economy'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Fare Paid</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {booking.currency} {parseFloat(booking.amount).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Barcode / QR Section */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center text-slate-900 shadow-sm">
                  <QrCode className="w-full h-full" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono text-slate-400">
                    SCAN AT BOARDING GATE
                  </div>
                  <div className="text-[10px] text-slate-300 font-semibold">
                    Official Electronic Boarding Pass
                  </div>
                </div>
              </div>

              {/* Barcode Strip */}
              <div className="hidden sm:flex flex-col items-end">
                <div className="font-mono text-xl tracking-widest text-slate-400 font-bold select-none opacity-80">
                  ||| | |||| || ||| ||||| | ||||
                </div>
                <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                  {booking.reference_code}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Warning / Dialog */}
          {cancelConfirmOpen ? (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                    Cancel Transport Reservation?
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
                    Cancelling will immediately release seat{' '}
                    <strong>{booking.seat_no || 'reservation'}</strong> back into public inventory. Historical booking record will be updated to cancelled.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setCancelConfirmOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelBooking}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Action Footer (Print, Close, Cancel button) */
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
              <div>
                {!isCancelled && (
                  <button
                    type="button"
                    onClick={() => setCancelConfirmOpen(true)}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors cursor-pointer"
                  >
                    Cancel this ticket
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Download / Print</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
