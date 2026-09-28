import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import ProfileModal from './components/auth/ProfileModal';
import HotelSearch from './components/hotels/HotelSearch';
import TransportSearch from './components/transport/TransportSearch';
import MyBookingsView from './components/hotels/MyBookingsView';
import TripsListView from './components/trips/TripsListView';
import TripDetailView from './components/trips/TripDetailView';
import CostEstimatorModal from './components/estimator/CostEstimatorModal';
import TravelHeroIllustration from './components/illustrations/TravelHeroIllustration';
import { 
  TransportIllustration, 
  ExpenseIllustration, 
  HotelIllustration, 
  EstimatorIllustration 
} from './components/illustrations/FeatureIllustrations';
import { ToastProvider } from './context/ToastContext';
import { Analytics } from '@vercel/analytics/react';
import { 
  Building2, 
  Plane, 
  Receipt, 
  Users, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ArrowUpRight, 
  Ticket, 
  Wallet,
  Lock,
  Calculator
} from 'lucide-react';

function parseUrlState() {
  if (typeof window === 'undefined') return { tab: 'home', tripId: null };
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const tripParam = params.get('tripId');
  const hash = window.location.hash.replace('#', '');
  const validTabs = ['home', 'trips', 'hotels', 'transport', 'bookings', 'expenses'];

  const tab = validTabs.includes(tabParam)
    ? tabParam
    : validTabs.includes(hash)
    ? hash
    : 'home';

  const tripId = tripParam ? parseInt(tripParam, 10) : null;
  return { tab, tripId };
}

function MainContent() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Initialize activeTab & selectedTripId from URL query or hash
  const initial = parseUrlState();
  const [activeTab, setActiveTab] = useState(initial.tab);
  const [selectedTripId, setSelectedTripId] = useState(initial.tripId);
  const [estimatorModalOpen, setEstimatorModalOpen] = useState(false);

  // Navigate function that logs history entries for browser back/forward buttons
  const navigateTo = (tab, tripId = null, push = true) => {
    setActiveTab(tab);
    setSelectedTripId(tripId);

    const params = new URLSearchParams();
    if (tab && tab !== 'home') {
      params.set('tab', tab);
    }
    if (tripId) {
      params.set('tripId', tripId.toString());
    }

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;

    if (push) {
      window.history.pushState({ tab, tripId }, '', newUrl);
    } else {
      window.history.replaceState({ tab, tripId }, '', newUrl);
    }
  };

  // Listen to browser Back / Forward (popstate)
  useEffect(() => {
    // Record initial page state in window.history
    const current = parseUrlState();
    window.history.replaceState(current, '', window.location.href);

    const onPopState = (e) => {
      if (e.state && e.state.tab !== undefined) {
        setActiveTab(e.state.tab || 'home');
        setSelectedTripId(e.state.tripId || null);
      } else {
        const parsed = parseUrlState();
        setActiveTab(parsed.tab);
        setSelectedTripId(parsed.tripId);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectTrip = (id) => {
    navigateTo('trips', id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar
        onOpenAuth={openAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          navigateTo(tab, null);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render Tab Specific Views */}
        {activeTab === 'hotels' ? (
          <HotelSearch 
            onOpenAuth={openAuth} 
            onOpenMyBookings={() => navigateTo('bookings')} 
          />
        ) : activeTab === 'transport' ? (
          <TransportSearch 
            onOpenAuth={openAuth} 
            onOpenMyBookings={() => navigateTo('bookings')} 
          />
        ) : activeTab === 'bookings' ? (
          <MyBookingsView 
            onExploreHotels={() => navigateTo('hotels')}
            onExploreTransport={() => navigateTo('transport')}
          />
        ) : activeTab === 'trips' || activeTab === 'expenses' ? (
          user ? (
            selectedTripId ? (
              <TripDetailView
                tripId={selectedTripId}
                onBack={() => navigateTo('trips', null)}
                onNavigateToBookings={() => navigateTo('bookings')}
              />
            ) : (
              <TripsListView
                onSelectTrip={handleSelectTrip}
                onExploreBookings={() => navigateTo('bookings')}
              />
            )
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-4 shadow-sm my-12 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to Access Trips & Expenses</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Create trips, set spending budgets, record multi-currency expenses, and view interactive financial analytics.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => openAuth('login')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Create Free Account
                </button>
              </div>
            </div>
          )
        ) : user ? (
          /* Logged In Dashboard View - Flat & Cohesive */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Welcome Banner */}
            <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-8 text-white border border-slate-800 shadow-xs relative">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/70 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Travel Style: {user.travel_style.toUpperCase()}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Welcome, {user.name}!
                </h1>
                <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
                  Plan your itinerary, search hotels & transport, reserve seats, track spending against budgets, and split group costs without hassle.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => navigateTo('trips', null)}
                    className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>My Trips & Expenses</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('transport')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-medium text-sm rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Search Flights & Trains</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('hotels')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-medium text-sm rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Browse Hotels</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('bookings')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-medium text-sm rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>My Reservations</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
              {[
                {
                  id: 'trips',
                  title: 'Trips & Expenses',
                  desc: 'Multi-currency budget tracking, category donut charts, and spending timeline.',
                  icon: Receipt,
                  badge: 'Budget Sync',
                  onClick: () => navigateTo('trips', null),
                },
                {
                  id: 'transport',
                  title: 'Flights & Trains',
                  desc: 'Interactive 30-row flight seat maps, train tiers, and bus routes.',
                  icon: Plane,
                  badge: 'Seat Selection',
                  onClick: () => navigateTo('transport'),
                },
                {
                  id: 'hotels',
                  title: 'Hotels & Stays',
                  desc: 'Search verified OpenStreetMap stays across top destinations.',
                  icon: Building2,
                  badge: 'Curated Stays',
                  onClick: () => navigateTo('hotels'),
                },
                {
                  id: 'bookings',
                  title: 'My Reservations',
                  desc: 'Manage hotel vouchers, flight boarding passes & cancellations.',
                  icon: Ticket,
                  badge: 'E-Tickets',
                  onClick: () => navigateTo('bookings'),
                },
                {
                  id: 'estimator',
                  title: 'Trip Cost Estimator',
                  desc: 'Predict and compare expenditure across budget, balanced, and comfort styles.',
                  icon: Calculator,
                  badge: 'Smart Forecast',
                  onClick: () => setEstimatorModalOpen(true),
                },
              ].map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={card.onClick}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group hover:-translate-y-0.5 relative"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {card.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1 flex items-center justify-between">
                      <span>{card.title}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{card.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Hub Status Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
                    {activeTab === 'home' ? 'Trip Planning & Financial Hub' : activeTab}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Smart Multi-Currency Expense Ledger & Group Debt Engine Active.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  All Systems Operational
                </span>
              </div>

              <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Dual-Currency Engine & Daily Sync
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Daily sync worker caches latest European Central Bank benchmark rates. Multi-currency expenses automatically compute and record base currency values with full audit precision.
                  </p>
                  <button
                    onClick={() => navigateTo('trips', null)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>Manage Expenses</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Visual Budget Analytics
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Category spending donut charts (Food, Stay, Transport, Activities), day-by-day spending timelines, and real-time budget utilization gauges with over-budget alerts.
                  </p>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 pt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Real-time Financial Graphs Active</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Flights, Stays & Reservations
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Linked hotel stays and 30-row cabin seat reservations automatically roll into your trip's pre-paid spending totals.
                  </p>
                  <button
                    onClick={() => navigateTo('bookings')}
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span>View Reservations</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Public Landing View - Sleek, Professional & Illustrated */
          <div className="space-y-20 py-4 animate-in fade-in duration-300">
            {/* Hero Section with Modern Vector Illustration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4 sm:pt-8">
              <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>The Modern Travel Operating Platform</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                  Plan, Book, and Split Trips in <span className="text-blue-600 dark:text-blue-400">One Workspace</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Search multi-modal transport with interactive seat maps, discover verified hotels, track live dual-currency budgets, and settle group debts with mathematical precision.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                  <button
                    onClick={() => openAuth('register')}
                    className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigateTo('transport')}
                    className="px-5 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors cursor-pointer"
                  >
                    Explore Transport
                  </button>
                  <button
                    onClick={() => setEstimatorModalOpen(true)}
                    className="px-5 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Calculator className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Cost Estimator</span>
                  </button>
                </div>

                {/* Micro trust indicators */}
                <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Real-time foreign exchange</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Instant seat selection</span>
                  </div>
                </div>
              </div>

              {/* Vector Illustration Container */}
              <div className="lg:col-span-6 flex justify-center items-center">
                <TravelHeroIllustration className="w-full max-w-lg lg:max-w-none" />
              </div>
            </div>

            {/* Metrics & Capabilities Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">40+</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Flight & Rail Corridors</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">30+</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Global Currencies</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">1-Click</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Group Debt Settlement</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">100%</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transparent Forecasts</div>
                </div>
              </div>
            </div>

            {/* Illustrated Feature Showcase Cards */}
            <div className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900">
                  Engineered For Seamless Journeys
                </span>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Everything you need for smarter travel
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  From multi-modal booking to post-trip financial reconciliation, TravelMate handles all logistics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Feature 1: Transport & Seat Maps */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Plane className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Multi-Modal Transport & Real-Time Seat Maps</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Search air corridors, high-speed rail, and express buses. Reserve specific cabin seats on 30-row aircraft layouts with concurrency protection and instant verified boarding passes.
                    </p>
                  </div>
                  <div className="px-6 pb-6">
                    <TransportIllustration />
                  </div>
                </div>

                {/* Feature 2: Group Expense & Settlement */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Group Expense Splitting & Debt Simplification</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Split bills equally, by exact percentages, or custom shares. Our minimal cash-flow engine resolves multi-member group balances into the smallest number of direct transfers.
                    </p>
                  </div>
                  <div className="px-6 pb-6">
                    <ExpenseIllustration />
                  </div>
                </div>

                {/* Feature 3: Curated Stays */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Curated Accommodations & Rate Comparison</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Discover verified properties powered by OpenStreetMap geo-data. Compare amenities, inspect star ratings, and view one-click outbound price comparisons against leading booking platforms.
                    </p>
                  </div>
                  <div className="px-6 pb-6">
                    <HotelIllustration />
                  </div>
                </div>

                {/* Feature 4: Cost Estimator */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden flex flex-col justify-between group">
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Predictive Multi-Package Cost Estimator</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Forecast your travel expenditure across Basic, Balanced, and Comfort tiers. Adjust daily food and sightseeing allowances to compare your custom budget before booking.
                    </p>
                  </div>
                  <div className="px-6 pb-6">
                    <EstimatorIllustration />
                  </div>
                </div>
              </div>
            </div>

            {/* Sleek CTA Banner (Flat Surface) */}
            <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative">
              <div className="space-y-3 text-center md:text-left relative z-10 max-w-xl">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                  Ready to upgrade your journey?
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Start planning your next trip with TravelMate
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Join travelers who coordinate itineraries, reserve transit and stays, and settle shared budgets effortlessly.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
                <button
                  onClick={() => openAuth('register')}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openAuth('login')}
                  className="px-6 py-3.5 bg-slate-800 hover:bg-slate-750 text-white font-semibold text-sm rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer onNavigateTab={(tab) => navigateTo(tab)} />

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

      {/* Standalone Cost Estimator Modal */}
      {estimatorModalOpen && (
        <CostEstimatorModal
          isOpen={estimatorModalOpen}
          onClose={() => setEstimatorModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <ToastProvider>
            <MainContent />
            <Analytics />
          </ToastProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
