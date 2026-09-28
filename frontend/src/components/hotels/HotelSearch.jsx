import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  Sparkles, 
  Building2, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  CalendarCheck
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import HotelCard from './HotelCard';
import HotelDetailModal from './HotelDetailModal';
import MyBookingsView from './MyBookingsView';
import EmptyState from '../common/EmptyState';

export default function HotelSearch({ onOpenAuth }) {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  // Active view: 'search' or 'bookings'
  const [subTab, setSubTab] = useState('search');

  // Search & Filter parameters
  const [city, setCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(20000);
  const [minStars, setMinStars] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
  const [travelStyle, setTravelStyle] = useState(user?.travel_style || 'balanced');
  const [page, setPage] = useState(1);

  // Data states
  const [hotels, setHotels] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 12 });
  const [citiesList, setCitiesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected hotel for modal
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Sync travel style from user if loaded
  useEffect(() => {
    if (user?.travel_style) {
      setTravelStyle(user.travel_style);
    }
  }, [user?.travel_style]);

  // Fetch hotels
  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 9,
        sortBy,
        style: travelStyle,
      };

      if (city && city !== 'all') params.city = city;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (maxPrice < 20000) params.maxPrice = maxPrice;
      if (minStars > 0) params.minStars = minStars;
      if (minRating > 0) params.minRating = minRating;

      const res = await api.get('/hotels', { params });
      if (res.data?.success) {
        setHotels(res.data.data.hotels);
        setPagination(res.data.data.pagination);
        if (res.data.data.cities) {
          setCitiesList(res.data.data.cities);
        }
      }
    } catch (err) {
      console.error('Failed to fetch hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'search') {
      fetchHotels();
    }
  }, [city, maxPrice, minStars, minRating, sortBy, travelStyle, page, subTab]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHotels();
  };

  const handleResetFilters = () => {
    setCity('');
    setSearchQuery('');
    setMaxPrice(20000);
    setMinStars(0);
    setMinRating(0);
    setSortBy('recommended');
    setPage(1);
  };

  const openHotelDetail = (hotel) => {
    setSelectedHotel(hotel);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Navigation Sub-Tabs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-sm">
              <Building2 className="w-3.5 h-3.5" />
              Verified OpenStreetMap Stays
            </span>
            <span className="text-xs text-slate-300">
              Live Currency Sync & Verified Partner Properties
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Explore Hotels & Stays
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Compare verified rates, inspect amenities, reserve accommodations seamlessly, or compare live partner rates on Booking.com & MakeMyTrip.
          </p>

          {/* Sub-Tabs: Search vs My Reservations */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setSubTab('search')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                subTab === 'search'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Catalog</span>
            </button>

            {user && (
              <button
                onClick={() => setSubTab('bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subTab === 'bookings'
                    ? 'bg-white text-indigo-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>My Reservations</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Decorative Light */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {subTab === 'bookings' ? (
        <MyBookingsView onExploreHotels={() => setSubTab('search')} />
      ) : (
        /* Hotel Search View */
        <div className="space-y-6">
          {/* Quick Destination Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setCity('');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                city === ''
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              All Destinations
            </button>
            {citiesList.map((c) => (
              <button
                key={c.city}
                onClick={() => {
                  setCity(c.city);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  city.toLowerCase() === c.city.toLowerCase()
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>{c.city}</span>
                <span className="text-[10px] opacity-75 font-mono">({c.count})</span>
              </button>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Keyword Search */}
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by hotel name or landmark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="sm:col-span-3">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="recommended">Recommended (Top Pick)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Guest Rating: High to Low</option>
                  <option value="stars_desc">Stars: 5★ to 1★</option>
                </select>
              </div>

              {/* Submit & Filter Toggle Buttons */}
              <div className="sm:col-span-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Search Stays
                </button>
                <button
                  type="button"
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Toggle Advanced Filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Filter Drawer */}
            {showFiltersMobile && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs animate-in fade-in duration-200">
                {/* Price Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200">
                    <span>Max Price per Night</span>
                    <span className="text-indigo-600 dark:text-cyan-400 font-bold font-mono">
                      {formatPrice(maxPrice).fullDisplay}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="20000"
                    step="500"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="w-full accent-indigo-600 dark:accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>₹1,500</span>
                    <span>₹20,000+</span>
                  </div>
                </div>

                {/* Star Filter */}
                <div className="space-y-2">
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">Minimum Star Category</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { val: 0, label: 'Any' },
                      { val: 3, label: '3★+' },
                      { val: 4, label: '4★+' },
                      { val: 5, label: '5★' },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => {
                          setMinStars(s.val);
                          setPage(1);
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                          minStars === s.val
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Travel Style Recommendation Preference */}
                <div className="space-y-2">
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    Travel Preference Weighting
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: 'cheapest', label: 'Cheapest (80/20)' },
                      { key: 'balanced', label: 'Balanced (50/50)' },
                      { key: 'comfort', label: 'Comfort (20/80)' },
                    ].map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => {
                          setTravelStyle(st.key);
                          setPage(1);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          travelStyle === st.key
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset Filters */}
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 underline font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <div>
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{hotels.length}</span> of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.total}</span> verified stays
              {city && (
                <span> in <strong className="text-indigo-600 dark:text-cyan-400">{city}</strong></span>
              )}
            </div>
            {sortBy === 'recommended' && (
              <span className="flex items-center gap-1 text-indigo-600 dark:text-cyan-400 font-semibold bg-indigo-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700">
                <Sparkles className="w-3 h-3" />
                Ranked by {travelStyle.toUpperCase()} preference
              </span>
            )}
          </div>

          {/* Hotel Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-pulse"
                >
                  <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 pt-4" />
                </div>
              ))}
            </div>
          ) : hotels.length === 0 ? (
            <EmptyState
              showIllustration={true}
              badge="No Stays Found"
              title="No Hotels Match Your Filters"
              description="No properties match your current destination or filter parameters. Try adjusting price bounds, minimum star ratings, or resetting filters."
              action={{
                label: 'Reset All Filters',
                icon: RotateCcw,
                onClick: handleResetFilters,
              }}
            />
          ) : (
            /* Hotel Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onSelect={openHotelDetail}
                  onBook={openHotelDetail}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      page === i + 1
                        ? 'bg-indigo-600 text-white shadow-sm'
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
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hotel Detail & Booking Modal */}
      <HotelDetailModal
        hotel={selectedHotel}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onOpenAuth={onOpenAuth}
        onBookingSuccess={() => {
          // Switch to bookings tab after successful booking
          setDetailModalOpen(false);
          setSubTab('bookings');
        }}
      />
    </div>
  );
}
