import React, { useState } from 'react';
import { Compass, User, LogOut, Sparkles, Globe, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import NotificationCenter from '../notifications/NotificationCenter';

export default function Navbar({ onOpenAuth, onOpenProfile, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { displayCurrency, setCurrency, supportedCurrencies } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const getStyleBadge = (style) => {
    switch (style) {
      case 'cheapest':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Cheapest</span>;
      case 'comfort':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">Comfort</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">Balanced</span>;
    }
  };

  const navItems = [
    { id: 'trips', label: 'My Trips' },
    { id: 'hotels', label: 'Hotels' },
    { id: 'transport', label: 'Transport' },
    { id: 'bookings', label: 'My Bookings' },
    { id: 'expenses', label: 'Expenses & Split' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => handleNavClick('home')}
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

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Section: Currency Selector & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Currency Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              title="Change Global Currency"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>{displayCurrency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {currencyDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20"
                  onClick={() => setCurrencyDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Display Currency
                  </div>
                  {supportedCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        setCurrencyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        displayCurrency === c.code
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-slate-400">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <NotificationCenter onNavigateTab={handleNavClick} />

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
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  logout();
                  toast.info('Signed out of TravelMate');
                }}
                title="Sign Out"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Profile & Actions */}
          <div className="pt-2 border-t border-slate-100">
            {user ? (
              <div className="space-y-2 pt-1">
                <div 
                  onClick={() => {
                    onOpenProfile();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.email}</div>
                    </div>
                  </div>
                  {getStyleBadge(user.travel_style)}
                </div>

                <button
                  onClick={() => {
                    logout();
                    toast.info('Signed out of TravelMate');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-center transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl text-center shadow-xs transition-colors cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
