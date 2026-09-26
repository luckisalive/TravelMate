import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Train, 
  Bus, 
  Search, 
  ArrowLeftRight, 
  Calendar, 
  Sparkles, 
  Filter, 
  SlidersHorizontal, 
  Loader2, 
  AlertCircle,
  Ticket,
  ChevronDown,
  Compass
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import TransportCard from './TransportCard';
import FlightSeatMapModal from './FlightSeatMapModal';
import TrainBusBookingModal from './TrainBusBookingModal';
import BoardingPassModal from './BoardingPassModal';

export default function TransportSearch({ onOpenAuth, onOpenMyBookings }) {
  const { user } = useAuth();
  const { displayCurrency } = useCurrency();

  // Search parameters
  const [mode, setMode] = useState('all'); // all, flight, train, bus
  const [origin, setOrigin] = useState('BOM');
  const [destination, setDestination] = useState('DEL');
  const [travelDate, setTravelDate] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [travelStyle, setTravelStyle] = useState(user?.travel_style || 'balanced');

  // Stations directory
  const [stations, setStations] = useState([]);

  // Results & UI State
  const [transports, setTransports] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Modals
  const [seatMapFlight, setSeatMapFlight] = useState(null);
  const [trainBusTransport, setTrainBusTransport] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Load stations on mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await api.get('/transport/stations');
        if (res.data?.success) {
          setStations(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load stations:', err);
      }
    };
    fetchStations();
  }, []);

  // Update travel style if user changes preference in profile
  useEffect(() => {
    if (user?.travel_style) {
      setTravelStyle(user.travel_style);
    }
  }, [user?.travel_style]);

  // Fetch transport options
  const fetchTransports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        sortBy,
        style: travelStyle,
        limit: 20,
      };

      if (mode !== 'all') params.mode = mode;
      if (origin && origin !== 'ALL') params.origin = origin;
      if (destination && destination !== 'ALL') params.destination = destination;
      if (travelDate) params.date = travelDate;

      const res = await api.get('/transport', { params });
      if (res.data?.success) {
        setTransports(res.data.data.transports);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch transport options:', err);
      setError('Unable to load transit options. Please refine your search criteria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransports();
  }, [mode, origin, destination, travelDate, sortBy, travelStyle]);

  // Swap Origin and Destination
  const handleSwapStations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  // Callback on successful booking
  const handleBookingSuccess = (bookingData) => {
    // Open Boarding Pass view
    setConfirmedBooking(bookingData.booking ? {
      ...bookingData.booking,
      transport: bookingData.transport,
    } : bookingData);
  };

  // Mode tabs definition
  const modeTabs = [
    { id: 'all', label: 'All Modes', icon: Compass },
    { id: 'flight', label: 'Flights', icon: Plane },
    { id: 'train', label: 'Trains', icon: Train },
    { id: 'bus', label: 'Buses', icon: Bus },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-indigo-700 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-sky-100 backdrop-blur-sm mb-3">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>Phase 5 Multi-Modal Transport & Flight Seat Map</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Book Flights, Trains & Intercity Buses
          </h1>
          <p className="mt-2 text-indigo-100 text-xs sm:text-sm leading-relaxed">
            Search scheduled corridors across India, pick your exact seat on aircraft cabins with atomic concurrency protection, and download your verified boarding passes.
          </p>
        </div>

        {/* Decorative Graphic */}
        <div className="absolute -right-8 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {modeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-102'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Origin Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              From (Origin)
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Origins</option>
              {stations.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.city} ({st.code}) — {st.type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Stations Button */}
          <div className="md:col-span-1 flex items-center justify-center pt-5">
            <button
              type="button"
              onClick={handleSwapStations}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors border border-slate-200"
              title="Swap Origin and Destination"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              To (Destination)
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Destinations</option>
              {stations.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.city} ({st.code}) — {st.type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Departure Date */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Departure Date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Secondary Filters: Sorting & Travel Style Preference */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Travel Style Weights */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Travel Style:</span>
            {['cheapest', 'balanced', 'comfort'].map((style) => (
              <button
                key={style}
                onClick={() => setTravelStyle(style)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  travelStyle === style
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="recommended">Recommended (Smart Heuristic)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="duration_asc">Duration: Fastest First</option>
              <option value="departs_asc">Departure: Earliest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Available Transit Schedules
          </h2>
          <p className="text-xs text-slate-500">
            Showing {transports.length} option{transports.length === 1 ? '' : 's'} across {origin || 'all'} → {destination || 'all'}
          </p>
        </div>

        {onOpenMyBookings && (
          <button
            onClick={onOpenMyBookings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Booked Tickets</span>
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-8 bg-slate-200 rounded" />
                <div className="h-8 bg-slate-200 rounded" />
                <div className="h-8 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : transports.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No transport options found for this route or filter
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your departure date, selecting "All Modes", or picking primary transit hubs like Mumbai (BOM), Delhi (DEL), Bengaluru (BLR), or Goa (GOI).
          </p>
          <button
            onClick={() => {
              setOrigin('BOM');
              setDestination('DEL');
              setMode('all');
              setTravelDate('');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Reset to Mumbai → Delhi
          </button>
        </div>
      ) : (
        /* Results Cards Grid */
        <div className="space-y-4">
          {transports.map((item) => (
            <TransportCard
              key={item.id}
              transport={item}
              onSelectSeat={(t) => setSeatMapFlight(t)}
              onBook={(t) => setTrainBusTransport(t)}
            />
          ))}
        </div>
      )}

      {/* Flight Seat Map Modal */}
      {seatMapFlight && (
        <FlightSeatMapModal
          isOpen={Boolean(seatMapFlight)}
          onClose={() => setSeatMapFlight(null)}
          transport={seatMapFlight}
          onBookingSuccess={handleBookingSuccess}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Train & Bus Booking Modal */}
      {trainBusTransport && (
        <TrainBusBookingModal
          isOpen={Boolean(trainBusTransport)}
          onClose={() => setTrainBusTransport(null)}
          transport={trainBusTransport}
          onBookingSuccess={handleBookingSuccess}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Boarding Pass / E-Ticket Modal */}
      {confirmedBooking && (
        <BoardingPassModal
          isOpen={Boolean(confirmedBooking)}
          onClose={() => setConfirmedBooking(null)}
          booking={confirmedBooking}
          onCancellationSuccess={() => {
            fetchTransports();
          }}
        />
      )}
    </div>
  );
}
