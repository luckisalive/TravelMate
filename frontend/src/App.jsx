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
  Ticket
} from 'lucide-react';

function MainContent() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar
        onOpenAuth={openAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
                  Plan your itinerary, search hotels & transport, reserve seats, track spending, and split group costs without hassle.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => setActiveTab('transport')}
                    className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center gap-2"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Search Flights & Trains</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('hotels')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Browse Hotels</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2"
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
                  id: 'transport',
                  title: 'Flights & Trains',
                  desc: 'Interactive 30-row flight seat maps, train tiers, and bus routes.',
                  icon: Plane,
                  color: 'from-emerald-500 to-teal-500',
                  bg: 'bg-emerald-50',
                  badge: 'Phase 5 Live',
                },
                {
                  id: 'hotels',
                  title: 'Hotels & Stays',
                  desc: 'Search verified OpenStreetMap stays across top destinations.',
                  icon: Building2,
                  color: 'from-sky-500 to-indigo-500',
                  bg: 'bg-sky-50',
                  badge: 'Phase 4 Live',
                },
                {
                  id: 'bookings',
                  title: 'My Reservations',
                  desc: 'Manage hotel vouchers, flight boarding passes & cancellations.',
                  icon: Ticket,
                  color: 'from-indigo-500 to-purple-500',
                  bg: 'bg-indigo-50',
                  badge: 'Unified',
                },
                {
                  id: 'expenses',
                  title: 'Split & Expenses',
                  desc: 'Multi-currency tracking and Splitwise-style simplify-debts.',
                  icon: Receipt,
                  color: 'from-purple-500 to-pink-500',
                  bg: 'bg-purple-50',
                  badge: 'Phase 6/7 Next',
                },
              ].map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => setActiveTab(card.id)}
                    className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 relative"
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
                    {activeTab === 'home' ? 'Trip Planning Overview' : activeTab}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Phase 5 Multi-Modal Transport Booking & Flight Seat Selection is active and verified.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Phase 5 Live
                </span>
              </div>

              <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2">
                  <div className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                    Flights, Trains & Buses
                  </div>
                  <p className="text-xs text-slate-600">
                    Search over 700 scheduled routes connecting Mumbai, Delhi, Bengaluru, Goa, and Jaipur with distance-based fares.
                  </p>
                  <button
                    onClick={() => setActiveTab('transport')}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 pt-1"
                  >
                    <span>Search Transport</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Interactive Cabin Seat Maps
                  </div>
                  <p className="text-xs text-slate-600">
                    Visual 30-row cabin layout with concurrency-safe atomic seat booking (ADR-005) and instant race-condition prevention.
                  </p>
                  <div className="text-xs font-mono text-indigo-600 pt-1">
                    55,000+ flight seats tracked
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    E-Tickets & Boarding Passes
                  </div>
                  <p className="text-xs text-slate-600">
                    Printable e-tickets with PNR, seat badges, live QR codes, and automatic seat release on cancellation.
                  </p>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 pt-1"
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
                No more juggling separate booking portals, spreadsheets, and Splitwise. TravelMate ties simulated transport, hotel bookings, multi-currency expenses, and fair group settlements together around your trip.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => openAuth('register')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTab('transport')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-indigo-700 font-semibold rounded-xl border border-indigo-200 shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plane className="w-4 h-4" />
                  <span>Search Flights & Trains</span>
                </button>
                <button
                  onClick={() => setActiveTab('hotels')}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Explore Hotels</span>
                </button>
              </div>
            </div>

            {/* Core Pillars Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div 
                onClick={() => setActiveTab('transport')}
                className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:border-indigo-300 transition-all hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                  <Plane className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center justify-between">
                  <span>Flights, Trains & Buses</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Interactive aircraft cabin seat maps, train class tiers, and highway express buses with atomic concurrency reservation.
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('hotels')}
                className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:border-indigo-300 transition-all hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center justify-between">
                  <span>Hotel Booking & Stays</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Search verified OpenStreetMap stays across top destinations with live dual-currency pricing and recommendation scoring.
                </p>
              </div>

              <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Splitwise-Style Settlements</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Equally or custom-split shared expenses among trip companions. The debt simplification algorithm minimizes peer transactions.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Auth & Profile Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
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
