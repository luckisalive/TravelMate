import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  MapPin, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import HotelReviewsList from '../reviews/HotelReviewsList';

export default function HotelDetailModal({ hotel, isOpen, onClose, onBookingSuccess, onOpenAuth }) {
  const { user } = useAuth();
  const toast = useToast();
  const { formatPrice, displayCurrency } = useCurrency();

  // Booking Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [rooms, setRooms] = useState(1);
  const [guests, setGuests] = useState(2);

  // Trips handling
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Outbound URLs
  const outboundUrls = {
    bookingCom: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent((hotel?.name || '') + ' ' + (hotel?.city || ''))}`,
    makeMyTrip: `https://www.makemytrip.com/hotels/hotel-listing/?searchText=${encodeURIComponent((hotel?.name || '') + ' ' + (hotel?.city || ''))}`,
    googleHotels: `https://www.google.com/travel/hotels?q=${encodeURIComponent((hotel?.name || '') + ' ' + (hotel?.city || ''))}`,
    airbnb: `https://www.airbnb.com/s/${encodeURIComponent(hotel?.city || '')}/homes`,
  };

  // Fetch user trips when modal opens and user is logged in
  useEffect(() => {
    if (isOpen && user) {
      async function loadTrips() {
        try {
          const res = await api.get('/trips');
          if (res.data?.success) {
            setTrips(res.data.data);
            if (res.data.data.length > 0) {
              setSelectedTripId(res.data.data[0].id.toString());
            } else {
              setIsCreatingTrip(true);
              setNewTripName(`Trip to ${hotel?.city || 'City'}`);
            }
          }
        } catch (err) {
          console.warn('Could not load user trips', err);
          setIsCreatingTrip(true);
          setNewTripName(`Trip to ${hotel?.city || 'City'}`);
        }
      }
      loadTrips();
    }
  }, [isOpen, user, hotel?.city]);

  if (!isOpen || !hotel) return null;

  // Calculate nights
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffDays = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const nights = Math.max(1, isNaN(diffDays) ? 1 : diffDays);

  const pricePerNightINR = parseFloat(hotel.price_per_night) || 0;
  const totalBaseINR = pricePerNightINR * nights * rooms;
  const priceEstimate = formatPrice(totalBaseINR);
  const nightPriceEstimate = formatPrice(pricePerNightINR);

  // Submit Booking
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    if (checkOutDate <= checkInDate) {
      setError('Check-out date must be strictly after check-in date.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        hotel_id: hotel.id,
        check_in: checkIn,
        check_out: checkOut,
        rooms: parseInt(rooms, 10),
        guests: parseInt(guests, 10),
        currency: displayCurrency,
      };

      if (isCreatingTrip || !selectedTripId) {
        payload.new_trip_name = newTripName.trim() || `Trip to ${hotel.city} (${checkIn})`;
      } else {
        payload.trip_id = parseInt(selectedTripId, 10);
      }

      const res = await api.post('/bookings/hotel', payload);
      if (res.data?.success) {
        toast.success(`Hotel booked at ${hotel.name}! Confirmation #${res.data.data.booking.reference_code}`);
        setConfirmedBooking(res.data.data);
        if (onBookingSuccess) {
          onBookingSuccess(res.data.data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to complete hotel booking.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Hero Banner */}
        <div className="relative h-64 sm:h-80 w-full bg-slate-800 shrink-0">
          <img
            src={hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Banner Meta Info */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 backdrop-blur-md text-xs font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                {hotel.city}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/80 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-white" />
                {hotel.stars.toFixed(1)} Stars
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600/80 backdrop-blur-md text-xs font-bold text-white">
                Guest Rating: {hotel.rating.toFixed(1)} / 5.0
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {hotel.name}
            </h1>

            {hotel.osm_id && (
              <p className="text-xs text-slate-300 mt-1">
                OpenStreetMap Reference: <code className="font-mono bg-black/30 px-1 py-0.5 rounded">{hotel.osm_id}</code>
                {hotel.lat && hotel.lon && ` (Lat: ${hotel.lat.toFixed(4)}, Lon: ${hotel.lon.toFixed(4)})`}
              </p>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1">
          {confirmedBooking ? (
            /* Booking Confirmation View */
            <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-2">
                  Confirmation #{confirmedBooking.booking.reference_code}
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Reservation Confirmed!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-2">
                  Your stay at <strong>{hotel.name}</strong> has been confirmed and registered to your trip itinerary.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span>Status</span>
                  <span className="font-bold text-emerald-600 uppercase">Confirmed</span>
                </div>
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>Dates</span>
                  <span className="font-semibold">{checkIn} to {checkOut} ({confirmedBooking.booking.nights} night(s))</span>
                </div>
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>Rooms & Guests</span>
                  <span className="font-semibold">{confirmedBooking.booking.rooms} Room(s), {confirmedBooking.booking.guests} Guest(s)</span>
                </div>
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>Total Base (INR)</span>
                  <span className="font-mono font-semibold">₹{confirmedBooking.booking.amount_base.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Charged ({confirmedBooking.booking.currency})</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono">
                    {confirmedBooking.booking.currency} {confirmedBooking.booking.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Details & Booking Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Details & Amenities */}
              <div className="lg:col-span-7 space-y-6">
                {/* Outbound Platform Links */}
                <div className="bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-950 dark:text-blue-200 mb-2">
                    <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Compare Live Listings on Real Platforms</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    Compare verified rates directly across leading global travel platforms:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={outboundUrls.bookingCom}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span>Booking.com</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href={outboundUrls.makeMyTrip}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span>MakeMyTrip</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href={outboundUrls.googleHotels}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span>Google Hotels</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href={outboundUrls.airbnb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors shadow-xs"
                    >
                      <span>Airbnb</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Key Amenities & Facilities</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(hotel.amenities || ['Free High-Speed Wi-Fi', 'Air Conditioning', '24/7 Front Desk', 'Luggage Storage']).map((amenity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verified Guest Reviews */}
                <HotelReviewsList hotelId={hotel.id} />

                {/* Instant Sync Card */}
                <div className="bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-200">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Instant Itinerary & Expense Synchronization</span>
                  </div>
                  <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                    Your confirmed stay automatically updates your trip itinerary, integrates with group debt allocations, and calculates currency conversions in real-time.
                  </p>
                </div>
              </div>

              {/* Right Column: Interactive Booking Form */}
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <form onSubmit={handleBookSubmit} className="space-y-4">
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Rate per night</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {nightPriceEstimate.isConverted ? `≈ ${nightPriceEstimate.formatted}` : nightPriceEstimate.formatted}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ night</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        min={todayStr}
                        onChange={(e) => setCheckIn(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        min={checkIn}
                        onChange={(e) => setCheckOut(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Rooms & Guests */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Rooms
                      </label>
                      <select
                        value={rooms}
                        onChange={(e) => setRooms(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Room' : 'Rooms'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Guests
                      </label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 6, 8, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Trip Selection */}
                  {user && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Attach to Trip
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCreatingTrip(!isCreatingTrip)}
                          className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                        >
                          {isCreatingTrip ? 'Select Existing' : '+ New Trip'}
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
                          {trips.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.start_date.split('T')[0]})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Price Calculation Summary */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Stay Duration</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{nights} night(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Total (INR)</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{totalBaseINR.toLocaleString()}</span>
                    </div>
                    {priceEstimate.isConverted && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span>Display ({displayCurrency})</span>
                        <span className="font-bold font-mono">≈ {priceEstimate.formatted}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline font-bold text-slate-900 dark:text-white text-sm">
                      <span>Total Estimate</span>
                      <span className="text-base text-blue-600 dark:text-blue-400 font-mono">
                        {priceEstimate.isConverted ? `≈ ${priceEstimate.formatted}` : priceEstimate.formatted}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming Reservation...</span>
                      </>
                    ) : user ? (
                      <span>Confirm Reservation</span>
                    ) : (
                      <span>Sign In to Book</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
