import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plane,
  Train,
  Bus,
  Calendar, 
  MapPin, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  Loader2, 
  QrCode, 
  X,
  Ticket,
  Armchair,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BoardingPassModal from '../transport/BoardingPassModal';

export default function MyBookingsView({ onExploreHotels, onExploreTransport }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // all, hotel, transport
  const [statusFilter, setStatusFilter] = useState('all'); // all, confirmed, cancelled
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [voucherModalBooking, setVoucherModalBooking] = useState(null);
  const [boardingPassBooking, setBoardingPassBooking] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch bookings
  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      const res = await api.get('/bookings', { params });
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
  }, [user, typeFilter]);

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
            My Travel Reservations & E-Tickets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View hotel vouchers, flight boarding passes, and rail/bus simulated tickets.
          </p>
        </div>

        {/* Type & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Booking Type Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'hotel', label: 'Hotels' },
              { id: 'transport', label: 'Transport' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  typeFilter === tab.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'all', label: 'All Statuses' },
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
          <p className="text-xs text-slate-500">Loading your reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {statusFilter === 'all'
                ? 'No Bookings Found'
                : `No ${statusFilter} Reservations`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              You haven't booked any stays or transport yet. Explore our verified hotels or scheduled flights and trains.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onExploreHotels && (
              <button
                onClick={onExploreHotels}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Browse Hotels
              </button>
            )}
            {onExploreTransport && (
              <button
                onClick={onExploreTransport}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
              >
                Search Transport
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Reservation Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isHotel = booking.type === 'hotel';
            const hotel = booking.hotel || {};
            const transport = booking.transport || {};

            const ModeIcon = transport.mode === 'flight' 
              ? Plane 
              : transport.mode === 'train' 
              ? Train 
              : Bus;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Reference & Status */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {booking.reference_code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 capitalize">
                        {isHotel ? '• Hotel Stay' : `• ${transport.mode?.toUpperCase()} Ticket`}
                      </span>
                    </div>

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
                  {isHotel ? (
                    /* Hotel Booking Card */
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
                  ) : (
                    /* Transport Booking Card */
                    <div className="p-5 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                        <ModeIcon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base leading-tight truncate">
                            {transport.operator} {transport.number}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            {transport.class}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                          <span>{transport.origin?.city} ({transport.origin?.code})</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{transport.destination?.city} ({transport.destination?.code})</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="text-amber-700 font-semibold flex items-center gap-1">
                            <Armchair className="w-3.5 h-3.5" />
                            <span>Seat {transport.seat_no || 'Standard'}</span>
                          </span>
                          {booking.trip_name && (
                            <span className="truncate text-indigo-600 font-medium">
                              • {booking.trip_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financials Breakdown */}
                  <div className="px-5 py-3 bg-slate-50/60 border-t border-b border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Recorded Fare</span>
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
                  {isHotel ? (
                    <button
                      onClick={() => setVoucherModalBooking(booking)}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View Hotel Voucher</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setBoardingPassBooking(booking)}
                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>View E-Ticket / Boarding Pass</span>
                    </button>
                  )}

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

      {/* Hotel Voucher Modal */}
      {voucherModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-800">Hotel E-Voucher</span>
              <button
                onClick={() => setVoucherModalBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
              <div className="text-xs text-indigo-800 font-mono font-bold">
                Booking Reference: {voucherModalBooking.reference_code}
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                {voucherModalBooking.hotel?.name}
              </h3>
              <p className="text-xs text-slate-600">
                {voucherModalBooking.hotel?.city} • {voucherModalBooking.check_in?.split('T')[0]} to {voucherModalBooking.check_out?.split('T')[0]}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
          </div>
        </div>
      )}

      {/* Boarding Pass / E-Ticket Modal */}
      {boardingPassBooking && (
        <BoardingPassModal
          isOpen={Boolean(boardingPassBooking)}
          onClose={() => setBoardingPassBooking(null)}
          booking={boardingPassBooking}
          onCancellationSuccess={(cancelledId) => {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === cancelledId ? { ...b, status: 'cancelled' } : b
              )
            );
          }}
        />
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Cancel Reservation?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to cancel booking{' '}
                <strong>{cancelModalBooking.reference_code}</strong>?
                {cancelModalBooking.type === 'transport' && (
                  <span className="block mt-1 text-slate-700">
                    The reserved seat will be automatically released back into available inventory.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancellingId !== null}
                onClick={handleCancelBooking}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {cancellingId !== null ? (
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
    </div>
  );
}
