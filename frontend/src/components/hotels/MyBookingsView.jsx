import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  Loader2, 
  QrCode, 
  X
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MyBookingsView({ onExploreHotels }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [voucherModalBooking, setVoucherModalBooking] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch bookings
  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings?type=hotel');
      if (res.data?.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  // Handle Cancel
  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setCancellingId(cancelModalBooking.id);
    try {
      const res = await api.patch(`/bookings/${cancelModalBooking.id}/cancel`);
      if (res.data?.success) {
        setActionMessage({
          type: 'success',
          text: `Reservation ${cancelModalBooking.reference_code} has been cancelled successfully.`,
        });
        // Update local state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === cancelModalBooking.id ? { ...b, status: 'cancelled' } : b
          )
        );
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to cancel reservation.',
      });
    } finally {
      setCancellingId(null);
      setCancelModalBooking(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            My Hotel Reservations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View, inspect vouchers, or cancel simulated hotel bookings for your trips.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'all', label: 'All Stays' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bookings List Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your hotel bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {statusFilter === 'all'
                ? 'No Hotel Reservations Yet'
                : `No ${statusFilter} Reservations`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Explore stays across Mumbai, Delhi, Goa, Jaipur, or Bengaluru and book a simulated reservation.
            </p>
          </div>
          <button
            onClick={onExploreHotels}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
          >
            Explore Hotels Now
          </button>
        </div>
      ) : (
        /* Reservation Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const hotel = booking.hotel || {};

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Reference & Status */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {booking.reference_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex gap-4">
                    <img
                      src={
                        hotel.image_url ||
                        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={hotel.name || 'Hotel'}
                      className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100 border border-slate-200"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{hotel.stars?.toFixed(1) || '4.0'} Stars</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                        {hotel.name || 'Verified Stay'}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{hotel.city}</span>
                        {booking.trip_name && (
                          <span className="truncate max-w-[120px] text-indigo-600 font-medium">
                            • {booking.trip_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium pt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {booking.check_in?.split('T')[0]} → {booking.check_out?.split('T')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financials Breakdown */}
                  <div className="px-5 py-3 bg-slate-50/60 border-t border-b border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Recorded Amount</span>
                      <span className="font-extrabold text-slate-900 font-mono text-sm">
                        {booking.currency} {booking.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">Base Total (INR)</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        ₹{booking.amount_base.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setVoucherModalBooking(booking)}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View Voucher</span>
                  </button>

                  {isConfirmed && (
                    <button
                      onClick={() => setCancelModalBooking(booking)}
                      className="py-2 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Cancel Reservation?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to cancel your stay at{' '}
                <strong>{cancelModalBooking.hotel?.name || 'this hotel'}</strong> (Ref: {cancelModalBooking.reference_code})?
                The booking status will update to cancelled in accordance with ADR-003.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancellingId !== null}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-200 transition-colors flex items-center justify-center gap-1.5"
              >
                {cancellingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-Voucher Modal */}
      {voucherModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-in zoom-in-95 duration-200">
            {/* Voucher Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-sky-700 p-6 text-white relative">
              <button
                onClick={() => setVoucherModalBooking(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-200">
                Official Travel Voucher • BCA Viva Simulation
              </span>
              <h3 className="text-xl font-black mt-1">
                {voucherModalBooking.hotel?.name || 'Hotel Stay'}
              </h3>
              <p className="text-xs text-indigo-100 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-sky-300" />
                {voucherModalBooking.hotel?.city}
              </p>
            </div>

            {/* Voucher Body Details */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Booking Reference</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {voucherModalBooking.reference_code}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reservation Status</span>
                  <span className="font-bold text-emerald-600 uppercase">
                    {voucherModalBooking.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Check-in Date</span>
                  <span className="font-semibold text-slate-800">
                    {voucherModalBooking.check_in?.split('T')[0]} (14:00)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Check-out Date</span>
                  <span className="font-semibold text-slate-800">
                    {voucherModalBooking.check_out?.split('T')[0]} (11:00)
                  </span>
                </div>
              </div>

              {/* Financials & Exchange Rates */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest Name</span>
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Currency Amount</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{voucherModalBooking.amount_base?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate Applied at Save</span>
                  <span className="font-mono text-slate-600">
                    1 INR = {voucherModalBooking.rate_used} {voucherModalBooking.currency}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Amount</span>
                  <span className="text-indigo-600 font-mono">
                    {voucherModalBooking.currency} {voucherModalBooking.amount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Simulated QR Code / Barcode */}
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/50">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800">Check-in QR Code</div>
                  <div className="text-[11px] text-slate-500">
                    Show this voucher at hotel front desk for express check-in.
                  </div>
                </div>
                <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherModalBooking(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
