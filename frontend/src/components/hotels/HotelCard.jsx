import React, { useState } from 'react';
import { Star, MapPin, ExternalLink, Sparkles, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

export default function HotelCard({ hotel, onSelect, onBook }) {
  const { formatPrice } = useCurrency();
  const [showOutbound, setShowOutbound] = useState(false);

  const priceInfo = formatPrice(hotel.price_per_night);

  // Fallback image if unsplash URL fails
  const [imgSrc, setImgSrc] = useState(
    hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
  );

  const outboundLinks = [
    {
      name: 'Booking.com',
      url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`,
      badge: 'Real Listings',
    },
    {
      name: 'MakeMyTrip',
      url: `https://www.makemytrip.com/hotels/hotel-listing/?searchText=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`,
      badge: 'India Rates',
    },
    {
      name: 'Google Hotels',
      url: `https://www.google.com/travel/hotels?q=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`,
      badge: 'Price Aggregator',
    },
    {
      name: 'Airbnb Stays',
      url: `https://www.airbnb.com/s/${encodeURIComponent(hotel.city)}/homes`,
      badge: 'Alternatives',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
      {/* Thumbnail & Badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={hotel.name}
          onError={() =>
            setImgSrc('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80')
          }
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* City Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-xs font-medium">
          <MapPin className="w-3 h-3 text-sky-400" />
          <span>{hotel.city}</span>
        </div>

        {/* Recommendation Badge if available */}
        {hotel.recommendation_reason && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-white text-xs font-semibold shadow-md">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span className="truncate max-w-[130px]">{hotel.recommendation_reason}</span>
          </div>
        )}

        {/* Simulated Disclaimer Tag */}
        <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm text-[10px] text-slate-200">
          Simulated Estimate
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Stars & Rating */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center text-amber-500 text-xs font-semibold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(hotel.stars)
                      ? 'fill-amber-400 text-amber-400'
                      : i < hotel.stars
                      ? 'fill-amber-400/50 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
              <span className="ml-1 text-slate-600 font-medium">{hotel.stars.toFixed(1)} Star</span>
            </div>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
              ★ {hotel.rating.toFixed(1)} / 5.0
            </span>
          </div>

          {/* Hotel Name */}
          <h3 
            onClick={() => onSelect(hotel)}
            className="font-bold text-slate-900 text-base leading-snug hover:text-indigo-600 cursor-pointer line-clamp-1 transition-colors"
            title={hotel.name}
          >
            {hotel.name}
          </h3>

          {/* Amenities Chips (Top 3) */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
                >
                  {amenity}
                </span>
              ))}
              {hotel.amenities.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
                  +{hotel.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & Actions Section */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-xs text-slate-500 block leading-none mb-1">
                Estimate per night
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {priceInfo.isConverted ? `≈ ${priceInfo.formatted}` : priceInfo.formatted}
                </span>
                <span className="text-xs text-slate-500">/ night</span>
              </div>
              {priceInfo.isConverted && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Base: {priceInfo.homeFormatted}
                </div>
              )}
            </div>

            {/* Outbound Platform Links Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOutbound(!showOutbound)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                title="Compare on real travel websites"
              >
                <span>Live Rates</span>
                <ExternalLink className="w-3 h-3" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showOutbound ? 'rotate-180' : ''}`} />
              </button>

              {showOutbound && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowOutbound(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Check Real Listings
                    </div>
                    {outboundLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowOutbound(false)}
                        className="flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <span className="font-medium">{link.name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {link.badge}
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelect(hotel)}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Details
            </button>
            <button
              onClick={() => onBook(hotel)}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Book Stay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
