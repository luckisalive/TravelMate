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
  X,
  Ticket,
  Armchair,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import BoardingPassModal from '../transport/BoardingPassModal';
import ReviewModal from '../reviews/ReviewModal';
import { BookingsListSkeleton } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';

export default function MyBookingsView({ onExploreHotels, onExploreTransport }) {
  const { user } = useAuth();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // all, hotel, transport
  const [statusFilter, setStatusFilter] = useState('all'); // all, confirmed, cancelled
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [voucherModalBooking, setVoucherModalBooking] = useState(null);
  const [boardingPassBooking, setBoardingPassBooking] = useState(null);
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState(new Set());
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch bookings and user reviews
  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
      };
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      const [bookRes, revRes] = await Promise.all([
        api.get('/bookings', { params }),
        api.get('/reviews/my').catch(() => ({ data: { success: false } })),
      ]);
      if (bookRes.data?.success) {
        setBookings(bookRes.data.data);
        if (bookRes.data.pagination) {
          setPagination(bookRes.data.pagination);
        }
      }
      if (revRes.data?.success && Array.isArray(revRes.data.data)) {
        setReviewedBookingIds(new Set(revRes.data.data.map((r) => r.booking_id)));
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, typeFilter, page]);

  // Handle Cancel
  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setCancellingId(cancelModalBooking.id);
    try {
      const res = await api.patch(`/bookings/${cancelModalBooking.id}/cancel`);
      if (res.data?.success) {
        const msg = `Reservation ${cancelModalBooking.reference_code} has been cancelled successfully.`;
        setActionMessage({
          type: 'success',
          text: msg,
        });
        toast.success(msg);
        // Update local state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === cancelModalBooking.id ? { ...b, status: 'cancelled' } : b
          )
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel reservation.';
      setActionMessage({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setCancellingId(null);
      setCancelModalBooking(null);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      const res = await api.patch(`/bookings/${bookingId}/complete`);
      if (res.data?.success) {
        const msg = 'Reservation marked as completed! You can now rate and review your experience.';
        setActionMessage({
          type: 'success',
          text: msg,
        });
        toast.success(msg);
        loadBookings();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to complete reservation.';
      setActionMessage({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            My Travel Reservations & E-Tickets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View hotel vouchers, flight boarding passes, and confirmed e-tickets.
          </p>
        </div>

        {/* Type & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Booking Type Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'hotel', label: 'Hotels' },
              { id: 'transport', label: 'Transport' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bookings List Content */}
      {loading ? (
        <BookingsListSkeleton count={4} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          showIllustration={true}
          badge={statusFilter === 'all' ? 'No Reservations' : `${statusFilter.toUpperCase()} Reservations`}
          title={statusFilter === 'all' ? 'No Bookings Found' : `No ${statusFilter} Reservations`}
          description="You haven't booked any stays or transport yet. Explore our verified hotels or scheduled flights and trains to reserve seats and rooms."
          action={
            onExploreHotels
              ? {
                  label: 'Browse Hotels',
                  icon: Building2,
                  onClick: onExploreHotels,
                }
              : null
          }
          secondaryAction={
            onExploreTransport
              ? {
                  label: 'Search Transport',
                  icon: Plane,
                  onClick: onExploreTransport,
                }
              : null
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Reservation Cards Grid */}
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Reference & Status */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {booking.reference_code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 capitalize">
                        {isHotel ? '• Hotel Stay' : `• ${transport.mode?.toUpperCase()} Ticket`}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                        isConfirmed
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800'
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
                        className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{hotel.stars?.toFixed(1) || '4.0'} Stars</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
                          {hotel.name || 'Verified Stay'}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{hotel.city}</span>
                          {booking.trip_name && (
                            <span className="truncate max-w-[120px] text-blue-600 dark:text-blue-400 font-medium">
                              • {booking.trip_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {booking.check_in?.split('T')[0]} → {booking.check_out?.split('T')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Transport Booking Card */
                    <div className="p-5 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                        <ModeIcon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
                            {transport.operator} {transport.number}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {transport.class}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span>{transport.origin?.city} ({transport.origin?.code})</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{transport.destination?.city} ({transport.destination?.code})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Armchair className="w-3.5 h-3.5" />
                            <span>Seat {transport.seat_no || 'Standard'}</span>
                          </span>
                          {(booking.passenger_name || transport.passenger_name) && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              • Traveler: {booking.passenger_name || transport.passenger_name}
                            </span>
                          )}
                          {booking.trip_name && (
                            <span className="truncate text-blue-600 dark:text-blue-400 font-medium">
                              • {booking.trip_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financials Breakdown */}
                  <div className="px-5 py-3 bg-slate-50/60 dark:bg-slate-950/30 border-t border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Recorded Fare</span>
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                        {booking.currency} {booking.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Base Total (INR)</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        ₹{booking.amount_base.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 rounded-b-2xl">
                  {isHotel ? (
                    <button
                      onClick={() => setVoucherModalBooking(booking)}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View Voucher</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setBoardingPassBooking(booking)}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>E-Ticket</span>
                    </button>
                  )}

                  {/* Reviews & Complete */}
                  {booking.status === 'completed' ? (
                    reviewedBookingIds.has(booking.id) ? (
                      <span className="py-2 px-3 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Reviewed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setReviewModalBooking(booking)}
                        className="py-2 px-3 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Write Review</span>
                      </button>
                    )
                  ) : isConfirmed ? (
                    <>
                      <button
                        onClick={() => handleCompleteBooking(booking.id)}
                        className="py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors cursor-pointer"
                        title="Mark completed to unlock reviews"
                      >
                        Mark Completed
                      </button>

                      <button
                        onClick={() => setCancelModalBooking(booking)}
                        className="py-2 px-3 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200/80 pt-6 px-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing {bookings.length} of {pagination.total} reservations
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pagination.totalPages, 7) }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      page === i + 1
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Hotel Voucher Modal */}
      {voucherModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Hotel E-Voucher</span>
              <button
                onClick={() => setVoucherModalBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold">
                Booking Reference: {voucherModalBooking.reference_code}
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {voucherModalBooking.hotel?.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {voucherModalBooking.hotel?.city} • {voucherModalBooking.check_in?.split('T')[0]} to {voucherModalBooking.check_out?.split('T')[0]}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Cancel Reservation?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to cancel booking{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{cancelModalBooking.reference_code}</strong>?
                {cancelModalBooking.type === 'transport' && (
                  <span className="block mt-1 text-slate-700 dark:text-slate-300">
                    The reserved seat will be automatically released back into available inventory.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancellingId !== null}
                onClick={handleCancelBooking}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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

      {/* Review Modal */}
      {reviewModalBooking && (
        <ReviewModal
          isOpen={Boolean(reviewModalBooking)}
          onClose={() => setReviewModalBooking(null)}
          booking={reviewModalBooking}
          onReviewSubmitted={() => {
            setActionMessage({
              type: 'success',
              text: 'Review published! Thank you for your feedback.',
            });
            loadBookings();
          }}
        />
      )}
    </div>
  );
}
