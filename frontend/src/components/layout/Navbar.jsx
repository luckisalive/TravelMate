import React, { useState } from 'react';
import { Compass, User, LogOut, Sparkles, Globe, Menu, X, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationCenter from '../notifications/NotificationCenter';

export default function Navbar({ onOpenAuth, onOpenProfile, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { displayCurrency, setCurrency, supportedCurrencies } = useCurrency();
  const { theme, toggleTheme, isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const getStyleBadge = (style) => {
    switch (style) {
      case 'cheapest':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">Cheapest</span>;
      case 'comfort':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-medium">Comfort</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-medium">Balanced</span>;
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
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
              TravelMate
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ml-2 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
              Platform
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === item.id
                  ? 'bg-violet-50 text-violet-700 dark:bg-slate-900 dark:text-cyan-400 font-semibold shadow-2xs border border-violet-100 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right Section: Currency Selector, Theme Toggle & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-amber-400 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* Currency Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Change Global Currency"
            >
              <Globe className="w-3.5 h-3.5 text-violet-600 dark:text-cyan-400" />
              <span>{displayCurrency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {currencyDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20"
                  onClick={() => setCurrencyDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Display Currency
                  </div>
                  {supportedCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        setCurrencyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        displayCurrency === c.code
                          ? 'bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-cyan-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-slate-400 dark:text-slate-500">{c.symbol}</span>
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
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
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-violet-50 text-violet-700 dark:bg-slate-900 dark:text-cyan-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Profile & Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {user ? (
              <div className="space-y-2 pt-1">
                <div 
                  onClick={() => {
                    onOpenProfile();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{user.email}</div>
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
                  className="w-full py-2 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                  className="py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-center transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl text-center shadow-xs transition-colors cursor-pointer"
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
