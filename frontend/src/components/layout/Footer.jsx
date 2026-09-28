import React from 'react';
import { Compass, ExternalLink, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';

export default function Footer({ onNavigateTab }) {
  const currentYear = new Date().getFullYear();

  const handleNav = (tab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="mt-auto bg-slate-900 dark:bg-slate-950 text-slate-400 border-t border-slate-800 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3 md:col-span-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                TravelMate
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The modern travel platform for coordinating group trips, booking transit and curated stays, tracking live multi-currency expenses, and settling balances with zero friction.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/70">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                Verified Travel & Expense Platform
              </span>
            </div>
          </div>

          {/* Col 2: Navigation & Services */}
          <div className="space-y-3 md:col-span-3">
            <div className="text-white font-bold text-xs uppercase tracking-wider">
              Explore & Book
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('trips')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  My Trips & Expense Ledger
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('transport')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Flights, Trains & Seat Maps
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('hotels')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Curated Hotels & Stays
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('bookings')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Reservations & Boarding Passes
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('expenses')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Group Split & Debt Simplification
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Open Data Attributions & Licensure */}
          <div className="space-y-3 md:col-span-5">
            <div className="flex items-center gap-1.5 text-white font-bold text-xs uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Open Data Attributions & Licensure</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              TravelMate is built upon open geographic, transit, and financial datasets in compliance with respective open licenses:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              {/* OpenStreetMap */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 dark:bg-slate-900 border border-slate-700/60 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    © OpenStreetMap
                  </span>
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 text-[10px]"
                  >
                    <span>ODbL</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-400">
                  Global stay & hotel locations queried via Overpass API.
                </p>
              </div>

              {/* OurAirports */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 dark:bg-slate-900 border border-slate-700/60 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">OurAirports</span>
                  <a
                    href="https://ourairports.com/data/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 text-[10px]"
                  >
                    <span>Public Domain</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-400">
                  Global airport directory, IATA/ICAO coordinates & hub data.
                </p>
              </div>

              {/* OpenFlights & DataMeet */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 dark:bg-slate-900 border border-slate-700/60 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">OpenFlights & DataMeet</span>
                  <a
                    href="https://openflights.org/data.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 text-[10px]"
                  >
                    <span>ODbL / CC-BY</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-400">
                  Aviation corridors & Indian Railways station coordinates.
                </p>
              </div>

              {/* Frankfurter API */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 dark:bg-slate-900 border border-slate-700/60 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Frankfurter API</span>
                  <a
                    href="https://www.frankfurter.app/docs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 text-[10px]"
                  >
                    <span>ECB Open Data</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-400">
                  Foreign exchange benchmark rates by European Central Bank.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Status */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            <p>
              © {currentYear} TravelMate Technologies Inc. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
            <span>•</span>
            <span className="hover:text-slate-200 transition-colors cursor-pointer">Security & Privacy</span>
            <span>•</span>
            <span className="hover:text-slate-200 transition-colors cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
