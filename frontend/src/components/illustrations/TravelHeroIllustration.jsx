import React from 'react';

/**
 * Modern flat vector UI schematic illustration for TravelMate hero section.
 * Clean, flat vector geometry without gradients, blurry shadows, or glowing rings.
 * Consistent across Light and Dark modes.
 */
export default function TravelHeroIllustration({ className = 'w-full h-auto max-w-lg' }) {
  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 540 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xs"
      >
        {/* Backdrop Circular Canvas (Adaptive Dark/Light flat surface) */}
        <circle
          cx="270"
          cy="210"
          r="190"
          className="fill-slate-100/70 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-800 transition-colors"
          strokeWidth="1.5"
        />

        {/* Ambient Warm Accent Marker */}
        <circle cx="440" cy="75" r="26" fill="#F59E0B" />

        {/* Flat Minimal Clouds */}
        <g className="fill-slate-200/70 dark:fill-slate-800/70 transition-colors">
          <path d="M 90 120 Q 90 100 110 100 Q 120 85 140 90 Q 160 85 170 100 Q 185 105 185 120 Z" />
          <path d="M 370 160 Q 370 145 385 145 Q 395 130 415 135 Q 430 130 440 145 Q 455 148 455 160 Z" />
        </g>

        {/* Clean Flight Trajectory Arc */}
        <path
          d="M 120 320 C 180 180, 290 80, 420 105"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 5"
        />

        {/* Central Stylized Device / Travel Dashboard Screen (Flat UI) */}
        <g>
          {/* Outer Phone Shell */}
          <rect
            x="180"
            y="90"
            width="180"
            height="270"
            rx="28"
            fill="#1E293B"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* Inner Display Glass */}
          <rect
            x="188"
            y="98"
            width="164"
            height="254"
            rx="22"
            className="fill-white dark:fill-slate-900 transition-colors"
          />

          {/* Camera / Speaker Notch */}
          <rect x="240" y="104" width="60" height="6" rx="3" fill="#334155" />

          {/* App Header Bar inside device */}
          <rect
            x="200"
            y="122"
            width="22"
            height="22"
            rx="6"
            className="fill-blue-50 dark:fill-blue-950/60"
          />
          <path
            d="M 207 133 L 215 133 M 211 129 L 215 133 L 211 137"
            stroke="#2563EB"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="230"
            y="126"
            width="70"
            height="7"
            rx="3.5"
            className="fill-slate-800 dark:fill-slate-200"
          />
          <rect x="230" y="136" width="45" height="5" rx="2.5" fill="#94A3B8" />

          {/* Interactive Seat Map / Card Preview inside device */}
          <rect
            x="200"
            y="152"
            width="140"
            height="85"
            rx="12"
            className="fill-slate-50 dark:fill-slate-800/60 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1"
          />

          {/* Flight Banner in Phone */}
          <rect
            x="208"
            y="160"
            width="42"
            height="14"
            rx="4"
            className="fill-blue-50 dark:fill-blue-950/80"
          />
          <text
            x="213"
            y="170"
            fill="#2563EB"
            fontSize="8"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            FL-802
          </text>

          {/* Mini Route in Phone */}
          <text
            x="208"
            y="190"
            className="fill-slate-900 dark:fill-white font-bold"
            fontSize="12"
            fontFamily="system-ui, sans-serif"
          >
            DEL
          </text>
          <path d="M 238 186 L 254 186" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="246" cy="186" r="3" fill="#2563EB" />
          <text
            x="260"
            y="190"
            className="fill-slate-900 dark:fill-white font-bold"
            fontSize="12"
            fontFamily="system-ui, sans-serif"
          >
            GOI
          </text>

          {/* Seat Map Dots in Phone */}
          <g>
            <circle cx="216" cy="214" r="5" fill="#10B981" />
            <circle cx="230" cy="214" r="5" fill="#CBD5E1" />
            <circle cx="244" cy="214" r="5" fill="#2563EB" />
            <circle cx="266" cy="214" r="5" fill="#CBD5E1" />
            <circle cx="280" cy="214" r="5" fill="#10B981" />
            <circle cx="294" cy="214" r="5" fill="#CBD5E1" />
          </g>

          {/* Expenses Mini-Graph inside device */}
          <rect
            x="200"
            y="246"
            width="140"
            height="84"
            rx="12"
            className="fill-slate-50 dark:fill-slate-800/60 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1"
          />
          <text
            x="210"
            y="262"
            className="fill-slate-600 dark:fill-slate-400 font-bold"
            fontSize="9"
            fontFamily="system-ui, sans-serif"
          >
            Group Split Settled
          </text>
          <text
            x="210"
            y="278"
            className="fill-slate-900 dark:fill-white font-extrabold"
            fontSize="14"
            fontFamily="system-ui, sans-serif"
          >
            ₹ 14,250
          </text>

          {/* Mini progress line */}
          <rect
            x="210"
            y="290"
            width="120"
            height="6"
            rx="3"
            className="fill-slate-200 dark:fill-slate-700"
          />
          <rect x="210" y="290" width="85" height="6" rx="3" fill="#2563EB" />
          <text
            x="210"
            y="312"
            className="fill-slate-500 dark:fill-slate-400 font-semibold"
            fontSize="8"
            fontFamily="system-ui, sans-serif"
          >
            3 friends settled • 0 pending
          </text>
        </g>

        {/* Flat Modern Jetliner Vector Flying Overhead */}
        <g transform="translate(320, 60) rotate(-15) scale(0.95)">
          {/* Airplane Fuselage */}
          <path
            d="M 20 28 C 50 16, 95 16, 120 28 C 130 32, 138 38, 140 42 C 138 46, 130 52, 120 56 C 95 68, 50 68, 20 56 C 10 52, 4 46, 4 42 C 4 38, 10 32, 20 28 Z"
            fill="#2563EB"
          />
          {/* Jet Main Wing (Top) */}
          <path d="M 50 30 L 25 -25 L 45 -25 L 85 30 Z" fill="#1D4ED8" />
          {/* Jet Main Wing (Bottom/Front) */}
          <path d="M 60 54 L 38 98 L 58 98 L 95 54 Z" fill="#1D4ED8" />
          {/* Jet Tail Fins */}
          <path d="M 12 32 L -5 6 L 10 6 L 24 32 Z" fill="#1E3A8A" />
          <path d="M 14 52 L 2 70 L 14 70 L 25 52 Z" fill="#1E3A8A" />
          {/* Cockpit Window */}
          <path d="M 124 38 Q 134 42 124 46 Q 118 42 124 38 Z" fill="#93C5FD" />
          {/* Passenger Cabin Window Dots */}
          <circle cx="50" cy="42" r="2.5" fill="#DBEAFE" />
          <circle cx="62" cy="42" r="2.5" fill="#DBEAFE" />
          <circle cx="74" cy="42" r="2.5" fill="#DBEAFE" />
          <circle cx="86" cy="42" r="2.5" fill="#DBEAFE" />
          <circle cx="98" cy="42" r="2.5" fill="#DBEAFE" />
          <circle cx="110" cy="42" r="2.5" fill="#DBEAFE" />
        </g>

        {/* Floating Left Card: Curated Stays / Hotel Booking (Flat UI Card) */}
        <g transform="translate(35, 175)">
          <rect
            width="145"
            height="96"
            rx="16"
            className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1.5"
          />

          <rect
            x="12"
            y="12"
            width="32"
            height="32"
            rx="8"
            className="fill-blue-50 dark:fill-blue-950/60"
          />
          <path
            d="M 22 36 L 22 20 L 34 20 L 34 36 Z M 25 24 H 27 M 29 24 H 31 M 25 28 H 27 M 29 28 H 31"
            stroke="#2563EB"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Stars */}
          <g fill="#F59E0B" transform="translate(52, 16)">
            <polygon
              points="5,0 6.5,3.2 10,3.6 7.5,6.1 8.1,9.6 5,8 1.9,9.6 2.5,6.1 0,3.6 3.5,3.2"
              transform="scale(0.8)"
            />
            <polygon
              points="17,0 18.5,3.2 22,3.6 19.5,6.1 20.1,9.6 17,8 13.9,9.6 14.5,6.1 12,3.6 15.5,3.2"
              transform="scale(0.8)"
            />
            <polygon
              points="29,0 30.5,3.2 34,3.6 31.5,6.1 32.1,9.6 29,8 25.9,9.6 26.5,6.1 24,3.6 27.5,3.2"
              transform="scale(0.8)"
            />
          </g>

          <text
            x="52"
            y="34"
            className="fill-slate-900 dark:fill-white font-bold"
            fontSize="10"
            fontFamily="system-ui, sans-serif"
          >
            Grand Riviera
          </text>
          <text
            x="14"
            y="60"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="9"
            fontFamily="system-ui, sans-serif"
          >
            Goa • Ocean Suite
          </text>

          <rect
            x="12"
            y="68"
            width="62"
            height="16"
            rx="6"
            className="fill-slate-100 dark:fill-slate-800"
          />
          <text
            x="18"
            y="79"
            className="fill-slate-700 dark:fill-slate-300 font-bold"
            fontSize="8"
            fontFamily="system-ui, sans-serif"
          >
            Verified Stay
          </text>

          <text
            x="94"
            y="80"
            className="fill-slate-900 dark:fill-white font-extrabold"
            fontSize="11"
            fontFamily="system-ui, sans-serif"
          >
            ₹4,200
          </text>
        </g>

        {/* Floating Right Card: Real-Time Currency Exchange Pill (Flat UI Card) */}
        <g transform="translate(365, 220)">
          <rect
            width="140"
            height="88"
            rx="16"
            className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-700 transition-colors"
            strokeWidth="1.5"
          />

          <rect
            x="12"
            y="12"
            width="28"
            height="28"
            rx="8"
            className="fill-blue-50 dark:fill-blue-950/60"
          />
          <text
            x="21"
            y="30"
            fill="#2563EB"
            fontSize="12"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            ₹
          </text>

          <text
            x="48"
            y="24"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="9"
            fontFamily="system-ui, sans-serif"
          >
            Live Dual-Currency
          </text>
          <text
            x="48"
            y="38"
            className="fill-slate-900 dark:fill-white font-bold"
            fontSize="12"
            fontFamily="system-ui, sans-serif"
          >
            INR ⇄ USD / EUR
          </text>

          <g transform="translate(12, 52)">
            <rect
              width="116"
              height="24"
              rx="6"
              className="fill-slate-100 dark:fill-slate-800"
            />
            <circle cx="16" cy="12" r="4" fill="#2563EB" />
            <text
              x="26"
              y="15"
              className="fill-slate-700 dark:fill-slate-300 font-semibold"
              fontSize="8.5"
              fontFamily="system-ui, sans-serif"
            >
              ECB Bank Rate Sync
            </text>
          </g>
        </g>

        {/* Location Pin Bottom Left */}
        <g transform="translate(110, 310)">
          <circle cx="18" cy="18" r="16" fill="#2563EB" />
          <path
            d="M 18 10 C 14.5 10 12 12.5 12 16 C 12 21 18 27 18 27 C 18 27 24 21 24 16 C 24 12.5 21.5 10 18 10 Z M 18 18 C 16.9 18 16 17.1 16 16 C 16 14.9 16.9 14 18 14 C 19.1 14 20 14.9 20 16 C 20 17.1 19.1 18 18 18 Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Group Member Floating Avatars (Flat Solid Circles) */}
        <g transform="translate(370, 115)">
          <circle cx="14" cy="14" r="14" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
          <text
            x="9"
            y="19"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            A
          </text>

          <circle cx="34" cy="14" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
          <text
            x="29"
            y="19"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            R
          </text>

          <circle cx="54" cy="14" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          <text
            x="50"
            y="19"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            S
          </text>

          <circle cx="74" cy="14" r="14" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
          <text
            x="68"
            y="18"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            +2
          </text>
        </g>
      </svg>
    </div>
  );
}
