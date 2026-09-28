import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plane, 
  Check, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Armchair,
  Users,
  Trash2,
  Plus
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FlightSeatMapSkeleton } from '../common/Skeletons';

export default function FlightSeatMapModal({ isOpen, onClose, transport, onBookingSuccess, onOpenAuth }) {
  const { user } = useAuth();
  const toast = useToast();
  const { displayCurrency, formatPrice } = useCurrency();

  const [seatsData, setSeatsData] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(true);
  
  // Multi-seat selection: array of { seat, passengerName }
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Trips state
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [newTripName, setNewTripName] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Fetch seat map
  const fetchSeatMap = async () => {
    if (!transport?.id) return;
    setLoadingSeats(true);
    setErrorMessage(null);
    try {
      const res = await api.get(`/transport/${transport.id}/seats`);
      if (res.data?.success) {
        setSeatsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch seat map:', err);
      setErrorMessage('Could not load aircraft seat map. Please try again.');
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    if (isOpen && transport?.id) {
      setSelectedSeats([]);
      fetchSeatMap();
    }
  }, [isOpen, transport?.id]);

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

  const singlePrice = parseFloat(transport.price) || 0;
  const seatCount = selectedSeats.length;
  const totalPrice = singlePrice * Math.max(1, seatCount);
  const singlePriceInfo = formatPrice(singlePrice);
  const totalPriceInfo = formatPrice(totalPrice);

  // Group seats by row number: { 1: [seatA, seatB, ...], 2: [...] }
  const rowsMap = {};
  if (seatsData?.seats) {
    for (const seat of seatsData.seats) {
      if (!rowsMap[seat.row]) {
        rowsMap[seat.row] = [];
      }
      rowsMap[seat.row].push(seat);
    }
  }

  const handleSeatClick = (seat) => {
    if (seat.is_booked) return;
    setErrorMessage(null);

    const isAlreadySelected = selectedSeats.some((s) => s.seat.id === seat.id);
    if (isAlreadySelected) {
      setSelectedSeats((prev) => prev.filter((s) => s.seat.id !== seat.id));
    } else {
      // Add new seat selection
      const defaultName = selectedSeats.length === 0 ? (user?.name || '') : '';
      setSelectedSeats((prev) => [...prev, { seat, passengerName: defaultName }]);
    }
  };

  const handlePassengerNameChange = (index, newName) => {
    setSelectedSeats((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], passengerName: newName };
      return copy;
    });
  };

  const handleRemoveSeat = (seatId) => {
    setSelectedSeats((prev) => prev.filter((s) => s.seat.id !== seatId));
  };

  // Handle Booking Submission
  const handleConfirmReservation = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    if (selectedSeats.length === 0) {
      setErrorMessage('Please select at least one seat from the aircraft cabin map.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const cleanedPassengers = selectedSeats.map((s, idx) => ({
        name: s.passengerName.trim() || (idx === 0 ? user.name : `Traveler ${idx + 1}`),
        seat_no: s.seat.seat_no,
      }));

      const payload = {
        transport_id: transport.id,
        passengers: cleanedPassengers,
        currency: displayCurrency,
      };

      if (isCreatingTrip || !selectedTripId) {
        payload.new_trip_name = newTripName.trim() || `Trip to ${transport.destination?.city || 'Destination'} (${departureDateFormatted})`;
      } else {
        payload.trip_id = parseInt(selectedTripId, 10);
      }

      const res = await api.post('/bookings/transport', payload);

      if (res.data?.success) {
        const seatNos = cleanedPassengers.map((p) => p.seat_no).join(', ');
        toast.success(`${cleanedPassengers.length} seat(s) confirmed (${seatNos})! Reference #${res.data.data.booking?.reference_code || ''}`);
        if (onBookingSuccess) {
          onBookingSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('Booking failed:', err);
      const errMsg = err.response?.data?.error?.message || 'Reservation failed. Please try again.';
      setErrorMessage(errMsg);
      // Refresh seat map in case seat was taken
      fetchSeatMap();
    } finally {
      setIsSubmitting(false);
    }
  };

  const departureDateFormatted = new Date(transport.departs_at).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const departureTime = new Date(transport.departs_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg">{transport.operator}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  {transport.number}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 font-medium">
                  {transport.class}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {transport.origin?.city} ({transport.origin?.code}) → {transport.destination?.city} ({transport.destination?.code}) • {departureDateFormatted} at {departureTime}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body: Seat Map & Sidebar Info */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Airplane Cabin Visualization */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Legend */}
            <div className="w-full flex flex-wrap items-center justify-center gap-4 py-2 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-blue-600 border border-blue-600 text-white flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 flex items-center justify-center text-[10px]">
                  ✕
                </div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <span>• Window (A, F)</span>
                <span>• Aisle (C, D)</span>
              </div>
            </div>

            {loadingSeats ? (
              <FlightSeatMapSkeleton />
            ) : (
              /* Airplane Cabin Fuselage */
              <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-300 dark:border-slate-700 rounded-[50px_50px_20px_20px] p-4 sm:p-6 shadow-inner relative flex flex-col items-center">
                {/* Cockpit representation */}
                <div className="w-24 h-10 border-t-2 border-x-2 border-slate-400 dark:border-slate-600 rounded-t-full bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                  Cockpit
                </div>

                {/* Column Headers */}
                <div className="w-full grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                  <div>A</div>
                  <div>B</div>
                  <div>C</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center">Aisle</div>
                  <div>D</div>
                  <div>E</div>
                  <div>F</div>
                </div>

                {/* Seat Rows Scrollable Container */}
                <div className="w-full max-h-[380px] overflow-y-auto pr-1 space-y-1.5">
                  {Object.keys(rowsMap).map((rowStr) => {
                    const rowNum = parseInt(rowStr, 10);
                    const rowSeats = rowsMap[rowNum] || [];

                    const seatA = rowSeats.find((s) => s.col === 'A');
                    const seatB = rowSeats.find((s) => s.col === 'B');
                    const seatC = rowSeats.find((s) => s.col === 'C');
                    const seatD = rowSeats.find((s) => s.col === 'D');
                    const seatE = rowSeats.find((s) => s.col === 'E');
                    const seatF = rowSeats.find((s) => s.col === 'F');

                    const isBusinessRow = rowNum <= 5;

                    const renderSeatButton = (seat) => {
                      if (!seat) {
                        return <div className="w-8 h-8 sm:w-9 sm:h-9" />;
                      }

                      const isSelected = selectedSeats.some((s) => s.seat.id === seat.id);
                      const isBooked = seat.is_booked;

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={isBooked}
                          onClick={() => handleSeatClick(seat)}
                          title={`Seat ${seat.seat_no} (${seat.type} - ${seat.tier})`}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1 scale-105 shadow-xs'
                              : isBooked
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700 cursor-not-allowed line-through'
                              : isBusinessRow
                              ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:scale-105'
                              : 'bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:scale-105'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : isBooked ? (
                            '✕'
                          ) : (
                            seat.seat_no
                          )}
                        </button>
                      );
                    };

                    return (
                      <div key={rowNum} className="grid grid-cols-7 gap-1 items-center">
                        {renderSeatButton(seatA)}
                        {renderSeatButton(seatB)}
                        {renderSeatButton(seatC)}

                        {/* Aisle Row Number */}
                        <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 text-center select-none">
                          {rowNum}
                        </div>

                        {renderSeatButton(seatD)}
                        {renderSeatButton(seatE)}
                        {renderSeatButton(seatF)}
                      </div>
                    );
                  })}
                </div>

                <div className="w-full text-center pt-3 text-[10px] text-slate-400 dark:text-slate-500">
                  Rows 1-5: Business Tier • Rows 6-30: Economy Cabin
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Reservation Details, Trip Selection & Passengers Form */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
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
                      placeholder="e.g. Goa Vacation 2026"
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

              {/* Selected Seats & Passengers Form */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Selected Seats & Travelers ({selectedSeats.length})</span>
                  </div>
                  {selectedSeats.length > 0 && (
                    <button
                      onClick={() => setSelectedSeats([])}
                      className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedSeats.length > 0 ? (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {selectedSeats.map((item, idx) => (
                      <div
                        key={item.seat.id}
                        className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {item.seat.seat_no}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                              Row {item.seat.row} • {item.seat.tier} ({item.seat.type})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSeat(item.seat.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Remove seat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={item.passengerName}
                            onChange={(e) => handlePassengerNameChange(idx, e.target.value)}
                            placeholder={idx === 0 ? 'Primary traveler full legal name' : `Traveler ${idx + 1} full legal name`}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                    <Armchair className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No seats selected yet</p>
                    <p className="text-[11px]">Click available seat(s) on the cabin map to select tickets for your group.</p>
                  </div>
                )}
              </div>

              {/* Fare & Currency Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Fare per Seat</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{singlePriceInfo.formatted}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Selected Seats</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSeats.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Airport Taxes & Reservation Fees</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Included</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-baseline justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Total Payable</span>
                  <div className="text-right">
                    <div className="font-extrabold text-lg text-blue-600 dark:text-blue-400">
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
            </div>

            {/* Bottom Actions */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || selectedSeats.length === 0}
                onClick={handleConfirmReservation}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Securing Seats with Concurrency Lock...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {selectedSeats.length > 0 
                        ? `Confirm ${selectedSeats.length} Flight Seat(s) Booking` 
                        : 'Select Seat(s) to Continue'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
