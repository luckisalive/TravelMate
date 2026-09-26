import React from 'react';
import { Compass, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200 py-8 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-800">TravelMate</span>
            <span>— BCA Final Year Capstone Project</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <span>Data Attributions:</span>
            <span>© OpenStreetMap contributors</span>
            <span>•</span>
            <span>OurAirports</span>
            <span>•</span>
            <span>OpenFlights</span>
            <span>•</span>
            <span>DataMeet Railways</span>
            <span>•</span>
            <span>Frankfurter API</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <p>All prices and inventory simulated for academic demonstration.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Crafted for reliable viva demonstration
          </p>
        </div>
      </div>
    </footer>
  );
}
