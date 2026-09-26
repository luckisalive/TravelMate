import React from 'react';
import { Compass, User, LogOut, Sparkles, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onOpenAuth, onOpenProfile, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const getStyleBadge = (style) => {
    switch (style) {
      case 'cheapest':
        return <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Cheapest</span>;
      case 'comfort':
        return <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">Comfort</span>;
      default:
        return <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">Balanced</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 via-sky-600 to-indigo-800 bg-clip-text text-transparent">
              TravelMate
            </span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 uppercase tracking-widest ml-2 font-semibold">
              BCA Project
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'trips', label: 'My Trips' },
            { id: 'hotels', label: 'Hotels' },
            { id: 'transport', label: 'Transport' },
            { id: 'expenses', label: 'Expenses & Split' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Controls & Currency Indicator */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getStyleBadge(user.travel_style)}
                    <span className="text-[11px] text-slate-500 font-mono">
                      {user.display_currency || 'INR'}
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
