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
  ChevronLeft,
  ChevronRight,
  Compass
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import TransportCard from './TransportCard';
import FlightSeatMapModal from './FlightSeatMapModal';
import TrainBusBookingModal from './TrainBusBookingModal';
import BoardingPassModal from './BoardingPassModal';
import EmptyState from '../common/EmptyState';

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
  const [page, setPage] = useState(1);
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
        page,
        limit: 15,
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

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [mode, origin, destination, travelDate, sortBy, travelStyle]);

  // Fetch when filters or page change
  useEffect(() => {
    fetchTransports();
  }, [mode, origin, destination, travelDate, sortBy, travelStyle, page]);

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
      <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xs relative">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/70 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Multi-Modal Transport & Real-Time Seat Selection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Book Flights, Trains & Intercity Buses
          </h1>
          <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
            Search scheduled corridors across India, pick your exact seat on aircraft cabins with atomic concurrency protection, and download your verified boarding passes.
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {modeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs scale-102'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Origin Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              From (Origin)
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Secondary Filters: Sorting & Travel Style Preference */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Travel Style Weights */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400">Travel Style:</span>
            {['cheapest', 'balanced', 'comfort'].map((style) => (
              <button
                key={style}
                onClick={() => setTravelStyle(style)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  travelStyle === style
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recommended">Recommended (Best Value)</option>
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
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Available Transit Schedules
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {transports.length} option{transports.length === 1 ? '' : 's'} across {origin || 'all'} → {destination || 'all'}
          </p>
        </div>

        {onOpenMyBookings && (
          <button
            onClick={onOpenMyBookings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-750 border border-blue-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Booked Tickets</span>
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
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
        <EmptyState
          showIllustration={true}
          badge="No Transit Options"
          title="No transport options found for this route"
          description="Try adjusting your departure date, selecting 'All Modes', or picking primary transit hubs like Mumbai (BOM), Delhi (DEL), Bengaluru (BLR), or Goa (GOI)."
          action={{
            label: 'Reset to Mumbai → Delhi',
            onClick: () => {
              setOrigin('BOM');
              setDestination('DEL');
              setMode('all');
              setTravelDate('');
            },
          }}
        />
      ) : (
        /* Results Cards Grid */
        <div className="space-y-4">
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

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800 pt-4 px-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing {transports.length} of {pagination.total} options
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
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
