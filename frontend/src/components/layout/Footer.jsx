import React from 'react';
import { Compass, ExternalLink, ShieldCheck, Database, Award, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      {/* Top Footer: Project & Attributions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Academic Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                TravelMate
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unified travel planning, simulated reservations, multi-currency expense tracking, and Splitwise-style group debt simplification.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                <Award className="w-3 h-3 text-amber-400" />
                BCA Final Year Capstone Project
              </span>
            </div>
          </div>

          {/* Col 2: Open Data Sources & Licensure (PRD Mandate) */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-1.5 text-white font-bold text-xs uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Open Data Attributions & Licensure</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              TravelMate is built upon open geographic, transit, and financial datasets. In compliance with the Open Database License (ODbL) and respective open licenses, we gratefully attribute our data providers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
              {/* OpenStreetMap */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    © OpenStreetMap contributors
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
                  Hotel and stay locations queried via Overpass API under the Open Data Commons Open Database License.
                </p>
              </div>

              {/* OurAirports */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
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
                  Global airport directory, IATA/ICAO coordinates, and hub classifications.
                </p>
              </div>

              {/* OpenFlights & DataMeet */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
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
                  Flight route topology and Indian Railways station coordinates (IRCTC/DataMeet).
                </p>
              </div>

              {/* Frankfurter API */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
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
                  Daily foreign exchange benchmark rates published by the European Central Bank.
                </p>
              </div>
            </div>
          </div>

          {/* Col 3: Architecture & Security */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-1.5 text-white font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Academic Architecture</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Designed as a modern full-stack web application featuring:
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>React 19 + Tailwind CSS SPA</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span>Node.js / Express REST API</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Neon PostgreSQL (ACID transactions)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Recharts Budget Analytics</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Greedy Min-Cash-Flow Algorithm</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Disclaimer */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            <p>
              © {currentYear} TravelMate Capstone. All transport schedules, hotel listings, and bookings are simulated for educational demonstration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span>Crafted for viva examination & project defense</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
