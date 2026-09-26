import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plane, 
  Check, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Armchair, 
  Sparkles,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';

export default function FlightSeatMapModal({ isOpen, onClose, transport, onBookingSuccess, onOpenAuth }) {
  const { user } = useAuth();
  const { displayCurrency, formatPrice } = useCurrency();

  const [seatsData, setSeatsData] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passengerName, setPassengerName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (user?.name && !passengerName) {
      setPassengerName(user.name);
    }
  }, [user]);

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
      setSelectedSeat(null);
      fetchSeatMap();
    }
  }, [isOpen, transport?.id]);

  if (!isOpen || !transport) return null;

  const priceInfo = formatPrice(transport.price);

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

  // Handle Booking Submission
  const handleConfirmReservation = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    if (!selectedSeat) {
      setErrorMessage('Please select a seat from the aircraft cabin map.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        transport_id: transport.id,
        seat_no: selectedSeat.seat_no,
        passenger_name: passengerName.trim() || user.name,
        currency: displayCurrency,
      };

      const res = await api.post('/bookings/transport', payload);

      if (res.data?.success) {
        onBookingSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error('Booking failed:', err);
      const errMsg = err.response?.data?.error?.message || 'Reservation failed. Please try again.';
      setErrorMessage(errMsg);
      // Refresh seat map in case seat was taken
      fetchSeatMap();
      setSelectedSeat(null);
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
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-700 via-indigo-700 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Plane className="w-5 h-5 text-sky-200" />
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
              <p className="text-xs text-indigo-100 mt-0.5">
                {transport.origin?.city} ({transport.origin?.code}) → {transport.destination?.city} ({transport.destination?.code}) • {departureDateFormatted} at {departureTime}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body: Seat Map & Sidebar Info */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Airplane Cabin Visualization */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* Legend */}
            <div className="w-full flex flex-wrap items-center justify-center gap-4 py-2 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md border border-slate-300 bg-white" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-indigo-600 border border-indigo-600 text-white flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span className="font-semibold text-indigo-700">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-slate-200 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]">
                  ✕
                </div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>• Window (A, F)</span>
                <span>• Aisle (C, D)</span>
              </div>
            </div>

            {loadingSeats ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs">Loading flight cabin seat map...</span>
              </div>
            ) : (
              /* Airplane Cabin Fuselage */
              <div className="w-full max-w-md bg-slate-50 border-2 border-slate-300 rounded-[50px_50px_20px_20px] p-4 sm:p-6 shadow-inner relative flex flex-col items-center">
                {/* Cockpit / Nose cone representation */}
                <div className="w-24 h-10 border-t-2 border-x-2 border-slate-400 rounded-t-full bg-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Cockpit
                </div>

                {/* Column Headers */}
                <div className="w-full grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 pb-2 border-b border-slate-200 mb-2">
                  <div>A</div>
                  <div>B</div>
                  <div>C</div>
                  <div className="text-[10px] text-slate-300 uppercase tracking-wider flex items-center justify-center">Aisle</div>
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

                      const isSelected = selectedSeat?.id === seat.id;
                      const isBooked = seat.is_booked;

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            setSelectedSeat(isSelected ? null : seat);
                            setErrorMessage(null);
                          }}
                          title={`Seat ${seat.seat_no} (${seat.type} - ${seat.tier})`}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 scale-105 shadow-sm'
                              : isBooked
                              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed line-through'
                              : isBusinessRow
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 hover:scale-105'
                              : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-300 hover:border-sky-400 hover:scale-105'
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
                        <div className="text-[10px] font-mono font-bold text-slate-400 text-center select-none">
                          {rowNum}
                        </div>

                        {renderSeatButton(seatD)}
                        {renderSeatButton(seatE)}
                        {renderSeatButton(seatF)}
                      </div>
                    );
                  })}
                </div>

                <div className="w-full text-center pt-3 text-[10px] text-slate-400">
                  Rows 1-5: Business Tier • Rows 6-30: Economy Cabin
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Reservation Details & Checkout Form */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Selected Seat Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Selected Seat
                </div>
                {selectedSeat ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {selectedSeat.seat_no}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 capitalize">
                          {selectedSeat.type} Seat
                        </div>
                        <div className="text-xs text-slate-500">
                          Row {selectedSeat.row} • {selectedSeat.tier} Class
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSeat(null)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                    <Armchair className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    Click an available seat on the cabin map to select it.
                  </div>
                )}
              </div>

              {/* Passenger Details Form */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Passenger Details
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Passenger Name
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Enter full legal name"
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Must match government ID presented at airport security.
                  </p>
                </div>
              </div>

              {/* Fare & Currency Breakdown */}
              <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Base Airfare</span>
                  <span className="font-semibold text-slate-800">{priceInfo.formatted}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Seat Reservation Fee</span>
                  <span className="font-semibold text-emerald-600">Included (Free)</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Airport Taxes & Fees</span>
                  <span className="font-semibold text-emerald-600">Included</span>
                </div>
                <div className="border-t border-indigo-200/80 pt-2 flex items-baseline justify-between">
                  <span className="font-bold text-xs text-slate-900">Total Payable</span>
                  <div className="text-right">
                    <div className="font-extrabold text-lg text-indigo-700">
                      {priceInfo.formatted}
                    </div>
                    {priceInfo.secondary && (
                      <div className="text-[10px] text-slate-500">
                        {priceInfo.secondary}
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
                disabled={isSubmitting || !selectedSeat}
                onClick={handleConfirmReservation}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Securing Seat with Concurrency Lock...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {selectedSeat ? `Confirm Seat ${selectedSeat.seat_no} Booking` : 'Select a Seat to Continue'}
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
