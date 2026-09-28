import React, { useState } from 'react';
import { 
  Plane, 
  Train, 
  Bus, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  ChevronDown, 
  Armchair, 
  ArrowRight,
  ShieldCheck 
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

export default function TransportCard({ transport, onBook, onSelectSeat }) {
  const { formatPrice } = useCurrency();
  const [showOutbound, setShowOutbound] = useState(false);

  const priceInfo = formatPrice(transport.price);
  const isFlight = transport.mode === 'flight';
  const isTrain = transport.mode === 'train';
  const isBus = transport.mode === 'bus';

  const ModeIcon = isFlight ? Plane : isTrain ? Train : Bus;

  const modeBadgeColor = isFlight 
    ? 'bg-sky-50 text-sky-700 border-sky-200' 
    : isTrain 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
    : 'bg-amber-50 text-amber-700 border-amber-200';

  const departureTime = new Date(transport.departs_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const arrivalTime = new Date(transport.arrives_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const departureDate = new Date(transport.departs_at).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Outbound platforms
  const outboundLinks = isFlight
    ? [
        { name: 'Google Flights', url: transport.outboundSearchUrls?.googleFlights, badge: 'Official Search' },
        { name: 'MakeMyTrip', url: transport.outboundSearchUrls?.makeMyTrip, badge: 'Domestic Fares' },
        { name: 'Skyscanner', url: transport.outboundSearchUrls?.skyscanner, badge: 'Global Metasearch' },
      ]
    : isTrain
    ? [
        { name: 'IRCTC Official', url: transport.outboundSearchUrls?.irctc, badge: 'Government Portal' },
        { name: 'ConfirmTkt', url: transport.outboundSearchUrls?.confirmTkt, badge: 'Live PNR & Seat Availability' },
      ]
    : [
        { name: 'RedBus', url: transport.outboundSearchUrls?.redBus, badge: 'Bus Tickets' },
        { name: 'AbhiBus', url: transport.outboundSearchUrls?.abhiBus, badge: 'Bus Comparison' },
      ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group p-5">
      {/* Top Row: Operator, Number, Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${modeBadgeColor}`}>
            <ModeIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                {transport.operator}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {transport.number}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">
              {transport.class} Class
            </div>
          </div>
        </div>

        {/* Recommendation Score Badge */}
        {transport.recommendation_reason && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
            <span>{transport.recommendation_reason}</span>
          </div>
        )}
      </div>

      {/* Middle Row: Departure, Duration, Arrival */}
      <div className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Origin */}
        <div className="sm:col-span-4">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {departureTime}
          </div>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {transport.origin?.city} ({transport.origin?.code})
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={transport.origin?.name}>
            {transport.origin?.name}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {departureDate}
          </div>
        </div>

        {/* Transit Line & Duration */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center px-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span>{transport.duration_formatted}</span>
          </span>
          <div className="w-full flex items-center">
            <div className="h-0.5 w-full bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-semibold tracking-wider">
            Non-Stop
          </span>
        </div>

        {/* Destination */}
        <div className="sm:col-span-4 sm:text-right">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {arrivalTime}
          </div>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {transport.destination?.city} ({transport.destination?.code})
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={transport.destination?.name}>
            {transport.destination?.name}
          </div>
        </div>
      </div>

      {/* Bottom Row: Price, Outbound Popover, Booking Action */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 mt-auto">
        {/* Price Section */}
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            All-Inclusive Fare
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
              {priceInfo.formatted}
            </span>
            {priceInfo.secondary && (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {priceInfo.secondary}
              </span>
            )}
          </div>
          {isFlight && transport.seats?.available > 0 && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <Armchair className="w-3 h-3" />
              <span>{transport.seats.available} seats available</span>
            </div>
          )}
        </div>

        {/* Outbound Link & Book Button */}
        <div className="flex items-center gap-2">
          {/* Outbound Platform Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOutbound(!showOutbound)}
              className="px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Compare on real travel websites"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="hidden sm:inline">Compare</span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>

            {showOutbound && (
              <>
                <div 
                  className="fixed inset-0 z-20"
                  onClick={() => setShowOutbound(false)}
                />
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                    Live Search Comparison
                  </div>
                  <div className="space-y-1">
                    {outboundLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                            {link.name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {link.badge}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Primary Action Button */}
          {isFlight ? (
            <button
              type="button"
              onClick={() => onSelectSeat(transport)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>Select Seat & Book</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBook(transport)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Book Ticket</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
