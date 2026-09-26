import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import ProfileModal from './components/auth/ProfileModal';
import HotelSearch from './components/hotels/HotelSearch';
import TransportSearch from './components/transport/TransportSearch';
import MyBookingsView from './components/hotels/MyBookingsView';
import TripsListView from './components/trips/TripsListView';
import TripDetailView from './components/trips/TripDetailView';
import { 
  Building2, 
  Plane, 
  Receipt, 
  Users, 
  Sparkles, 
  ArrowRight, 
  MapPin, 
  CheckCircle2, 
  ArrowUpRight, 
  Ticket, 
  Wallet,
  Lock
} from 'lucide-react';

function MainContent() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTripId, setSelectedTripId] = useState(null);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectTrip = (id) => {
    setSelectedTripId(id);
    setActiveTab('trips');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar
        onOpenAuth={openAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'trips' && tab !== 'expenses') {
            setSelectedTripId(null);
          }
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render Tab Specific Views */}
        {activeTab === 'hotels' ? (
          <HotelSearch 
            onOpenAuth={openAuth} 
            onOpenMyBookings={() => setActiveTab('bookings')} 
          />
        ) : activeTab === 'transport' ? (
          <TransportSearch 
            onOpenAuth={openAuth} 
            onOpenMyBookings={() => setActiveTab('bookings')} 
          />
        ) : activeTab === 'bookings' ? (
          <MyBookingsView 
            onExploreHotels={() => setActiveTab('hotels')}
            onExploreTransport={() => setActiveTab('transport')}
          />
        ) : activeTab === 'trips' || activeTab === 'expenses' ? (
          user ? (
            selectedTripId ? (
              <TripDetailView
                tripId={selectedTripId}
                onBack={() => setSelectedTripId(null)}
                onNavigateToBookings={() => setActiveTab('bookings')}
              />
            ) : (
              <TripsListView
                onSelectTrip={(id) => setSelectedTripId(id)}
                onExploreBookings={() => setActiveTab('bookings')}
              />
            )
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4 shadow-sm my-12 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Sign in to Access Trips & Expenses</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Create trips, set spending budgets, record multi-currency expenses, and view interactive Recharts financial analytics.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => openAuth('login')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Create Free Account
                </button>
              </div>
            </div>
          )
        ) : user ? (
          /* Logged In Dashboard View */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-indigo-700 via-sky-700 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-indigo-100 backdrop-blur-sm mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Travel Preference: {user.travel_style.toUpperCase()}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Welcome, {user.name}!
                </h1>
                <p className="mt-2 text-indigo-100 text-sm sm:text-base leading-relaxed">
                  Plan your itinerary, search hotels & transport, reserve seats, track spending against budgets, and split group costs without hassle.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedTripId(null);
                      setActiveTab('trips');
                    }}
                    className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>My Trips & Expenses</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('transport')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Search Flights & Trains</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('hotels')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Browse Hotels</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>My Bookings</span>
                  </button>
                </div>
              </div>

              {/* Decorative Circle */}
              <div className="absolute -right-12 -bottom-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  id: 'trips',
                  title: 'Trips & Expenses',
                  desc: 'Multi-currency budget tracking, category donut charts, and spending timeline.',
                  icon: Receipt,
                  color: 'from-purple-500 to-indigo-600',
                  bg: 'bg-purple-50',
                  badge: 'Phase 6 Live',
                  onClick: () => {
                    setSelectedTripId(null);
                    setActiveTab('trips');
                  },
                },
                {
                  id: 'transport',
                  title: 'Flights & Trains',
                  desc: 'Interactive 30-row flight seat maps, train tiers, and bus routes.',
                  icon: Plane,
                  color: 'from-emerald-500 to-teal-500',
                  bg: 'bg-emerald-50',
                  badge: 'Phase 5 Live',
                  onClick: () => setActiveTab('transport'),
                },
                {
                  id: 'hotels',
                  title: 'Hotels & Stays',
                  desc: 'Search verified OpenStreetMap stays across top destinations.',
                  icon: Building2,
                  color: 'from-sky-500 to-indigo-500',
                  bg: 'bg-sky-50',
                  badge: 'Phase 4 Live',
                  onClick: () => setActiveTab('hotels'),
                },
                {
                  id: 'bookings',
                  title: 'My Reservations',
                  desc: 'Manage hotel vouchers, flight boarding passes & cancellations.',
                  icon: Ticket,
                  color: 'from-indigo-500 to-purple-500',
                  bg: 'bg-indigo-50',
                  badge: 'Unified',
                  onClick: () => setActiveTab('bookings'),
                },
              ].map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={card.onClick}
                    className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 relative"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                        {card.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center justify-between">
                      <span>{card.title}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Hub Status Summary */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 capitalize">
                    {activeTab === 'home' ? 'Trip Planning & Financial Hub' : activeTab}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Phase 6 Expense Manager & Dual-Currency Engine is active and verified.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Phase 6 Live
                </span>
              </div>

              <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Dual-Currency Engine & Daily Sync
                  </div>
                  <p className="text-xs text-slate-600">
                    Frankfurter daily sync worker caches latest rates. Multi-currency expenses automatically compute and store immutable base currency (INR) values at entry time (ADR-004).
                  </p>
                  <button
                    onClick={() => {
                      setSelectedTripId(null);
                      setActiveTab('trips');
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>Manage Expenses</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2">
                  <div className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                    Recharts Visual Analytics
                  </div>
                  <p className="text-xs text-slate-600">
                    Category spending donut charts (Food, Stay, Transport, Activities), day-by-day spending timelines, and real-time budget utilization gauges with over-budget alerts.
                  </p>
                  <div className="text-xs font-mono text-sky-600 pt-1">
                    Visual Analytics Live
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Flights, Stays & Reservations
                  </div>
                  <p className="text-xs text-slate-600">
                    Linked hotel stays and 30-row cabin seat reservations automatically roll into your trip's pre-paid spending totals.
                  </p>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>View Reservations</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Public Landing View */
          <div className="space-y-16 py-6 animate-in fade-in duration-300">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Unified Travel & Group Expense Platform</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Plan, Book, and Split Trips in <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-800 bg-clip-text text-transparent">One Place</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Search multi-modal transport with flight seat maps, browse curated hotels, track travel budgets with live currency conversion, and simplify shared group expenses.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => openAuth('register')}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Start Planning Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTab('transport')}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-xs transition-colors cursor-pointer"
                >
                  Explore Flights & Trains
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <MainContent />
      </CurrencyProvider>
    </AuthProvider>
  );
}
