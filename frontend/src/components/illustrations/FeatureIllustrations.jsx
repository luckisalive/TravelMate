import React from 'react';

/**
 * Modern flat vector illustrations for TravelMate features.
 * Flat geometric UI styling with solid fills and clean lines.
 * Adaptive to both Light and Dark modes.
 */

export function TransportIllustration({ className = 'w-full h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Card Background Canvas */}
        <rect
          width="320"
          height="180"
          rx="18"
          className="fill-slate-50 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-700/60 transition-colors"
          strokeWidth="1"
        />

        {/* Route Guideline */}
        <path d="M 30 145 C 90 145, 140 135, 290 135" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="4 4" />
        <path d="M 40 100 C 100 40, 200 30, 280 50" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

        {/* High Speed Train Vector (Flat Solid Fills) */}
        <g transform="translate(100, 110)">
          {/* Train Car 1 (Engine) */}
          <path d="M 60 12 C 105 12, 130 18, 145 28 L 140 38 L 40 38 L 40 12 Z" fill="#2563EB" />
          {/* Train Nose Cone Aerodynamic Curve */}
          <path d="M 130 18 C 145 22, 155 32, 155 38 L 140 38 Z" fill="#1D4ED8" />
          {/* Train Windshield Glass */}
          <path d="M 115 16 L 135 22 L 132 28 L 115 24 Z" fill="#BAE6FD" />
          {/* Passenger Windows */}
          <rect x="52" y="18" width="14" height="8" rx="2" fill="#E0F2FE" />
          <rect x="72" y="18" width="14" height="8" rx="2" fill="#E0F2FE" />
          <rect x="92" y="18" width="14" height="8" rx="2" fill="#E0F2FE" />
          {/* Accent speed stripe */}
          <path d="M 40 32 L 145 32" stroke="#F59E0B" strokeWidth="2.5" />
          {/* Wheels / Undercarriage */}
          <rect x="44" y="38" width="20" height="4" rx="2" fill="#334155" />
          <rect x="115" y="38" width="20" height="4" rx="2" fill="#334155" />
        </g>

        {/* Modern Jetliner Vector Flying Upper Right (Flat Fills) */}
        <g transform="translate(170, 25) rotate(-8) scale(0.75)">
          <path
            d="M 15 20 C 40 12, 80 12, 100 20 C 110 24, 116 28, 118 32 C 116 36, 110 40, 100 44 C 80 52, 40 52, 15 44 C 5 40, 2 36, 2 32 C 2 28, 5 24, 15 20 Z"
            fill="#2563EB"
          />
          <path d="M 40 22 L 15 -15 L 35 -15 L 70 22 Z" fill="#1D4ED8" />
          <path d="M 50 42 L 28 78 L 48 78 L 80 42 Z" fill="#1D4ED8" />
          <circle cx="104" cy="28" r="3" fill="#BAE6FD" />
          <circle cx="45" cy="32" r="2" fill="#DBEAFE" />
          <circle cx="55" cy="32" r="2" fill="#DBEAFE" />
          <circle cx="65" cy="32" r="2" fill="#DBEAFE" />
          <circle cx="75" cy="32" r="2" fill="#DBEAFE" />
        </g>

        {/* Seat Map Floating Mini Badge */}
        <g transform="translate(25, 25)">
          <rect
            width="84"
            height="64"
            rx="12"
            className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1"
          />
          <rect x="8" y="8" width="68" height="12" rx="4" className="fill-slate-100 dark:fill-slate-700" />
          <text x="14" y="17" className="fill-slate-600 dark:fill-slate-300 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">
            CABIN 14A
          </text>
          {/* Seats representation */}
          <g transform="translate(12, 28)">
            <rect x="0" y="0" width="10" height="10" rx="3" fill="#10B981" />
            <rect x="14" y="0" width="10" height="10" rx="3" className="fill-slate-200 dark:fill-slate-700" />
            <rect x="36" y="0" width="10" height="10" rx="3" fill="#2563EB" />
            <rect x="50" y="0" width="10" height="10" rx="3" fill="#10B981" />

            <rect x="0" y="14" width="10" height="10" rx="3" className="fill-slate-200 dark:fill-slate-700" />
            <rect x="14" y="14" width="10" height="10" rx="3" fill="#10B981" />
            <rect x="36" y="14" width="10" height="10" rx="3" className="fill-slate-200 dark:fill-slate-700" />
            <rect x="50" y="14" width="10" height="10" rx="3" className="fill-slate-200 dark:fill-slate-700" />
          </g>
        </g>

        {/* Waypoint Station Pin */}
        <g transform="translate(265, 120)">
          <circle cx="12" cy="12" r="10" fill="#2563EB" />
          <circle cx="12" cy="12" r="4" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

export function ExpenseIllustration({ className = 'w-full h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect
          width="320"
          height="180"
          rx="18"
          className="fill-slate-50 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-700/60 transition-colors"
          strokeWidth="1"
        />

        {/* Floating Split Receipt Vector */}
        <g transform="translate(30, 20)">
          <path
            d="M 0 8 C 0 3.6 3.6 0 8 0 L 82 0 C 86.4 0 90 3.6 90 8 L 90 135 L 82 130 L 74 135 L 66 130 L 58 135 L 50 130 L 42 135 L 34 130 L 26 135 L 18 130 L 10 135 L 0 130 Z"
            className="fill-white dark:fill-slate-850 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1"
          />

          <rect x="12" y="14" width="30" height="5" rx="2.5" fill="#2563EB" />
          <rect x="12" y="24" width="66" height="2" className="fill-slate-200 dark:fill-slate-700" />

          {/* Receipt line items */}
          <rect x="12" y="34" width="40" height="4" rx="2" fill="#64748B" />
          <rect x="62" y="34" width="16" height="4" rx="2" className="fill-slate-900 dark:fill-white" />

          <rect x="12" y="44" width="32" height="4" rx="2" fill="#64748B" />
          <rect x="62" y="44" width="16" height="4" rx="2" className="fill-slate-900 dark:fill-white" />

          <rect x="12" y="54" width="36" height="4" rx="2" fill="#64748B" />
          <rect x="62" y="54" width="16" height="4" rx="2" className="fill-slate-900 dark:fill-white" />

          <rect x="12" y="66" width="66" height="1.5" stroke="#CBD5E1" strokeDasharray="3 3" />

          {/* Total & Split Per Person */}
          <text x="12" y="80" className="fill-slate-900 dark:fill-white font-extrabold" fontSize="9" fontFamily="system-ui, sans-serif">
            Total: ₹4,800
          </text>

          <rect x="10" y="90" width="70" height="18" rx="6" className="fill-emerald-50 dark:fill-emerald-950/60" />
          <text x="14" y="102" className="fill-emerald-700 dark:fill-emerald-400 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">
            Split: ₹1,200/ea
          </text>
        </g>

        {/* Credit Card Vector (Flat Solid) */}
        <g transform="translate(150, 25)">
          <rect width="140" height="88" rx="14" fill="#1E293B" stroke="#334155" strokeWidth="1" />

          {/* Card Chip */}
          <rect x="16" y="20" width="22" height="16" rx="4" fill="#F59E0B" />

          {/* Wireless wave */}
          <path d="M 44 24 Q 48 28 44 32" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />

          <rect x="16" y="52" width="60" height="4" rx="2" fill="#FFFFFF" opacity="0.6" />
          <rect x="16" y="60" width="40" height="4" rx="2" fill="#FFFFFF" opacity="0.4" />

          <circle cx="115" cy="62" r="10" fill="#EF4444" opacity="0.9" />
          <circle cx="103" cy="62" r="10" fill="#F59E0B" opacity="0.9" />
        </g>

        {/* Connected Settlement Graph Nodes */}
        <g transform="translate(140, 125)">
          {/* Link Lines with Transfer Arrows */}
          <path d="M 25 15 L 75 15" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
          <polygon points="75,15 69,11 69,19" fill="#10B981" />

          <path d="M 85 15 L 135 15" stroke="#2563EB" strokeWidth="2" strokeDasharray="3 3" />
          <polygon points="135,15 129,11 129,19" fill="#2563EB" />

          {/* Node 1 */}
          <circle cx="15" cy="15" r="14" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
          <text x="11" y="19" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="system-ui, sans-serif">A</text>

          {/* Node 2 */}
          <circle cx="80" cy="15" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          <text x="76" y="19" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="system-ui, sans-serif">R</text>

          {/* Node 3 */}
          <circle cx="145" cy="15" r="14" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
          <text x="141" y="19" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="system-ui, sans-serif">S</text>
        </g>
      </svg>
    </div>
  );
}

export function HotelIllustration({ className = 'w-full h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect
          width="320"
          height="180"
          rx="18"
          className="fill-slate-50 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-700/60 transition-colors"
          strokeWidth="1"
        />

        {/* Modern Boutique Hotel Facade (Flat Solid Fills) */}
        <g transform="translate(45, 20)">
          {/* Main Tower */}
          <rect x="20" y="20" width="105" height="120" rx="10" fill="#1E293B" stroke="#334155" strokeWidth="1" />

          {/* Rooftop Garden Accent */}
          <rect x="25" y="14" width="40" height="6" rx="3" fill="#10B981" />
          <rect x="75" y="14" width="45" height="6" rx="3" fill="#0284C7" />

          {/* Illuminated Hotel Windows */}
          <g fill="#FEF08A">
            <rect x="32" y="32" width="14" height="14" rx="3" />
            <rect x="54" y="32" width="14" height="14" rx="3" fill="#93C5FD" />
            <rect x="76" y="32" width="14" height="14" rx="3" />
            <rect x="98" y="32" width="14" height="14" rx="3" />

            <rect x="32" y="56" width="14" height="14" rx="3" fill="#93C5FD" />
            <rect x="54" y="56" width="14" height="14" rx="3" />
            <rect x="76" y="56" width="14" height="14" rx="3" />
            <rect x="98" y="56" width="14" height="14" rx="3" fill="#93C5FD" />

            <rect x="32" y="80" width="14" height="14" rx="3" />
            <rect x="54" y="80" width="14" height="14" rx="3" />
            <rect x="76" y="80" width="14" height="14" rx="3" fill="#93C5FD" />
            <rect x="98" y="80" width="14" height="14" rx="3" />
          </g>

          {/* Grand Entrance Canopy */}
          <rect x="52" y="112" width="40" height="28" rx="4" fill="#334155" />
          <rect x="62" y="118" width="20" height="22" rx="2" fill="#FEF3C7" />
          <path d="M 44 112 L 100 112" stroke="#F59E0B" strokeWidth="3" />
        </g>

        {/* Resort Lounge & Pool Vector */}
        <g transform="translate(180, 50)">
          {/* Floating Rating Pill */}
          <rect
            width="105"
            height="50"
            rx="14"
            className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1"
          />
          <text x="12" y="20" className="fill-slate-900 dark:fill-white font-bold" fontSize="10" fontFamily="system-ui, sans-serif">
            Boutique Stay
          </text>

          <g fill="#F59E0B" transform="translate(12, 26)">
            <polygon points="5,0 6.5,3.2 10,3.6 7.5,6.1 8.1,9.6 5,8 1.9,9.6 2.5,6.1 0,3.6 3.5,3.2" transform="scale(0.7)" />
            <polygon points="17,0 18.5,3.2 22,3.6 19.5,6.1 20.1,9.6 17,8 13.9,9.6 14.5,6.1 12,3.6 15.5,3.2" transform="scale(0.7)" />
            <polygon points="29,0 30.5,3.2 34,3.6 31.5,6.1 32.1,9.6 29,8 25.9,9.6 26.5,6.1 24,3.6 27.5,3.2" transform="scale(0.7)" />
            <polygon points="41,0 42.5,3.2 46,3.6 43.5,6.1 44.1,9.6 41,8 37.9,9.6 38.5,6.1 36,3.6 39.5,3.2" transform="scale(0.7)" />
            <polygon points="53,0 54.5,3.2 58,3.6 55.5,6.1 56.1,9.6 53,8 49.9,9.6 50.5,6.1 48,3.6 51.5,3.2" transform="scale(0.7)" />
          </g>
          <text x="64" y="34" className="fill-emerald-600 dark:fill-emerald-400 font-bold" fontSize="9" fontFamily="system-ui, sans-serif">
            4.9/5
          </text>

          {/* Keycard Vector (Flat) */}
          <g transform="translate(10, 60)">
            <rect width="85" height="52" rx="10" fill="#2563EB" stroke="#60A5FA" strokeWidth="1" />
            <rect x="8" y="10" width="18" height="14" rx="3" fill="#DBEAFE" />
            <circle cx="68" cy="18" r="6" fill="#60A5FA" />
            <rect x="8" y="34" width="40" height="4" rx="2" fill="#FFFFFF" opacity="0.8" />
            <text x="56" y="38" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="system-ui, sans-serif">
              KEYLESS
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

export function EstimatorIllustration({ className = 'w-full h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect
          width="320"
          height="180"
          rx="18"
          className="fill-slate-50 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-700/60 transition-colors"
          strokeWidth="1"
        />

        {/* Comparison Tier Chart Vector (Flat Solid Bars) */}
        <g transform="translate(35, 20)">
          <rect
            width="150"
            height="140"
            rx="16"
            className="fill-white dark:fill-slate-850 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1"
          />

          <text x="14" y="22" className="fill-slate-900 dark:fill-white font-bold" fontSize="10" fontFamily="system-ui, sans-serif">
            Predicted Outlay
          </text>
          <text x="14" y="34" className="fill-slate-500 dark:fill-slate-400" fontSize="8" fontFamily="system-ui, sans-serif">
            3 Travel Tiers
          </text>

          {/* Bar 1: Budget (Flat) */}
          <rect x="22" y="85" width="26" height="42" rx="5" fill="#10B981" />
          <text x="24" y="80" className="fill-emerald-600 dark:fill-emerald-400 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">
            ₹12k
          </text>
          <text x="24" y="137" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7" fontFamily="system-ui, sans-serif">
            Basic
          </text>

          {/* Bar 2: Balanced Highlight (Brand Accent Flat) */}
          <rect x="62" y="55" width="26" height="72" rx="5" fill="#2563EB" />
          <text x="64" y="50" className="fill-blue-600 dark:fill-blue-400 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">
            ₹24k
          </text>
          <text x="62" y="137" className="fill-blue-600 dark:fill-blue-400 font-bold" fontSize="7" fontFamily="system-ui, sans-serif">
            Optimal
          </text>

          {/* Bar 3: Comfort (Flat) */}
          <rect x="102" y="40" width="26" height="87" rx="5" fill="#F59E0B" />
          <text x="104" y="35" className="fill-amber-600 dark:fill-amber-400 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">
            ₹38k
          </text>
          <text x="104" y="137" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7" fontFamily="system-ui, sans-serif">
            Luxury
          </text>
        </g>

        {/* Budget Accuracy Gauge Card */}
        <g transform="translate(200, 30)">
          <rect
            width="95"
            height="115"
            rx="16"
            className="fill-white dark:fill-slate-850 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1"
          />

          {/* Circular Gauge Arc */}
          <circle cx="47" cy="45" r="28" fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="7" />
          <circle cx="47" cy="45" r="28" fill="none" stroke="#2563EB" strokeWidth="7" strokeDasharray="140 180" strokeLinecap="round" />

          <text x="36" y="48" className="fill-slate-900 dark:fill-white font-extrabold" fontSize="12" fontFamily="system-ui, sans-serif">
            96%
          </text>
          <text x="26" y="58" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="6" fontFamily="system-ui, sans-serif">
            ACCURACY
          </text>

          <rect x="12" y="82" width="71" height="20" rx="6" className="fill-blue-50 dark:fill-blue-950/60" />
          <text x="18" y="95" className="fill-blue-700 dark:fill-blue-300 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">
            Within Target
          </text>
        </g>
      </svg>
    </div>
  );
}
