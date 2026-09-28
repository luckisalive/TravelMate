import React from 'react';

/**
 * Modern flat vector illustration for TravelMate hero section.
 * Adapts seamlessly to both Light and Dark modes.
 */
export default function TravelHeroIllustration({ className = 'w-full h-auto max-w-lg' }) {
  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 540 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xl dark:drop-shadow-[0_12px_32px_rgba(99,102,241,0.2)]"
      >
        <defs>
          {/* Plane & Sky Gradients */}
          <linearGradient id="jetBody" x1="280" y1="80" x2="380" y2="150" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>

          <linearGradient id="jetWing" x1="310" y1="90" x2="350" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4338CA" />
            <stop offset="1" stopColor="#0891B2" />
          </linearGradient>

          {/* Device Outer Frame */}
          <linearGradient id="deviceFrame" x1="160" y1="110" x2="280" y2="380" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>

          {/* Sun / Accent Glow */}
          <linearGradient id="sunGlow" x1="410" y1="40" x2="470" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>

          {/* Shadows */}
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.12" />
          </filter>
          <filter id="badgeShadow" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#4338CA" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Backdrop Circular Canvas (Adaptive Dark/Light) */}
        <circle cx="270" cy="210" r="190" className="fill-indigo-50/80 dark:fill-slate-900/90 stroke-indigo-100/60 dark:stroke-slate-800 transition-colors" strokeWidth="1" />
        
        {/* Decorative Grid Lines / Horizon Rings */}
        <ellipse cx="270" cy="270" rx="170" ry="60" className="stroke-slate-300 dark:stroke-slate-700/60" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.6" />
        <ellipse cx="270" cy="240" rx="140" ry="45" className="stroke-slate-300 dark:stroke-slate-700/60" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />

        {/* Ambient Sun / Morning Accent */}
        <circle cx="440" cy="75" r="32" fill="url(#sunGlow)" opacity="0.9" />
        <circle cx="440" cy="75" r="42" stroke="#FDE68A" strokeWidth="2" strokeDasharray="3 4" opacity="0.6" />

        {/* Stylized Flat Clouds */}
        <g className="fill-white dark:fill-slate-800/80 transition-colors" opacity="0.85">
          <path d="M 90 120 Q 90 100 110 100 Q 120 85 140 90 Q 160 85 170 100 Q 185 105 185 120 Z" />
          <path d="M 370 160 Q 370 145 385 145 Q 395 130 415 135 Q 430 130 440 145 Q 455 148 455 160 Z" />
        </g>

        {/* Flight Trajectory Arc */}
        <path
          d="M 120 320 C 180 180, 290 80, 420 105"
          fill="none"
          stroke="#818CF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="6 8"
        />

        {/* Central Stylized Device / Travel Dashboard Screen */}
        <g filter="url(#softShadow)">
          {/* Outer Phone Shell */}
          <rect x="180" y="90" width="180" height="270" rx="28" fill="url(#deviceFrame)" stroke="#334155" strokeWidth="1.5" />
          {/* Inner Display Glass */}
          <rect x="188" y="98" width="164" height="254" rx="22" className="fill-white dark:fill-slate-900 transition-colors" />
          
          {/* Camera Notch */}
          <rect x="240" y="104" width="60" height="7" rx="3.5" fill="#475569" />

          {/* App Header Bar inside device */}
          <rect x="200" y="122" width="22" height="22" rx="6" className="fill-violet-100 dark:fill-violet-950/60" />
          <path d="M 207 133 L 215 133 M 211 129 L 215 133 L 211 137" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="230" y="126" width="70" height="7" rx="3.5" className="fill-slate-900 dark:fill-white" />
          <rect x="230" y="136" width="45" height="5" rx="2.5" fill="#94A3B8" />

          {/* Interactive Seat Map / Card Preview inside device */}
          <rect x="200" y="152" width="140" height="85" rx="14" className="fill-slate-50 dark:fill-slate-800/80 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
          
          {/* Flight Banner in Phone */}
          <rect x="208" y="160" width="40" height="14" rx="4" className="fill-violet-100 dark:fill-violet-950" />
          <text x="214" y="170" fill="#6366F1" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">FL-802</text>
          
          {/* Mini Route in Phone */}
          <text x="208" y="190" className="fill-slate-900 dark:fill-white font-bold" fontSize="12" fontFamily="system-ui, sans-serif">DEL</text>
          <path d="M 238 186 L 254 186" stroke="#06B6D4" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="246" cy="186" r="3" fill="#06B6D4" />
          <text x="260" y="190" className="fill-slate-900 dark:fill-white font-bold" fontSize="12" fontFamily="system-ui, sans-serif">GOI</text>

          {/* Seat Map Dots in Phone */}
          <g>
            <circle cx="216" cy="214" r="5" fill="#10B981" />
            <circle cx="230" cy="214" r="5" fill="#94A3B8" />
            <circle cx="244" cy="214" r="5" fill="#6366F1" />
            <circle cx="266" cy="214" r="5" fill="#94A3B8" />
            <circle cx="280" cy="214" r="5" fill="#10B981" />
            <circle cx="294" cy="214" r="5" fill="#94A3B8" />
          </g>

          {/* Expenses Mini-Graph inside device */}
          <rect x="200" y="246" width="140" height="84" rx="14" className="fill-emerald-50/70 dark:fill-emerald-950/40 stroke-emerald-200 dark:stroke-emerald-800/60" strokeWidth="1" />
          <text x="210" y="262" className="fill-emerald-800 dark:fill-emerald-300 font-bold" fontSize="9" fontFamily="system-ui, sans-serif">Group Split Settled</text>
          <text x="210" y="278" className="fill-slate-900 dark:fill-white font-extrabold" fontSize="14" fontFamily="system-ui, sans-serif">₹ 14,250</text>
          
          {/* Mini progress line */}
          <rect x="210" y="290" width="120" height="6" rx="3" className="fill-emerald-200 dark:fill-emerald-950" />
          <rect x="210" y="290" width="85" height="6" rx="3" fill="#10B981" />
          <text x="210" y="312" className="fill-emerald-700 dark:fill-emerald-400 font-semibold" fontSize="8" fontFamily="system-ui, sans-serif">3 friends settled • 0 pending</text>
        </g>

        {/* Modern Jetliner Vector Flying Overhead */}
        <g transform="translate(320, 60) rotate(-15) scale(0.95)" filter="url(#softShadow)">
          {/* Airplane Fuselage */}
          <path
            d="M 20 28 C 50 16, 95 16, 120 28 C 130 32, 138 38, 140 42 C 138 46, 130 52, 120 56 C 95 68, 50 68, 20 56 C 10 52, 4 46, 4 42 C 4 38, 10 32, 20 28 Z"
            fill="url(#jetBody)"
          />
          {/* Jet Main Wing (Top) */}
          <path d="M 50 30 L 25 -25 L 45 -25 L 85 30 Z" fill="url(#jetWing)" />
          {/* Jet Main Wing (Bottom/Front) */}
          <path d="M 60 54 L 38 98 L 58 98 L 95 54 Z" fill="url(#jetWing)" />
          {/* Jet Tail Fins */}
          <path d="M 12 32 L -5 6 L 10 6 L 24 32 Z" fill="#312E81" />
          <path d="M 14 52 L 2 70 L 14 70 L 25 52 Z" fill="#1E1B4B" />
          {/* Cockpit Window */}
          <path d="M 124 38 Q 134 42 124 46 Q 118 42 124 38 Z" fill="#BAE6FD" />
          {/* Passenger Cabin Window Dots */}
          <circle cx="50" cy="42" r="2.5" fill="#E0F2FE" opacity="0.9" />
          <circle cx="62" cy="42" r="2.5" fill="#E0F2FE" opacity="0.9" />
          <circle cx="74" cy="42" r="2.5" fill="#E0F2FE" opacity="0.9" />
          <circle cx="86" cy="42" r="2.5" fill="#E0F2FE" opacity="0.9" />
          <circle cx="98" cy="42" r="2.5" fill="#E0F2FE" opacity="0.9" />
          <circle cx="110" cy="42" r="2.5" fill="#E0F2FE" opacity="0.9" />
        </g>

        {/* Floating Left Card: Curated Stays / Hotel Booking */}
        <g transform="translate(35, 175)" filter="url(#badgeShadow)">
          <rect width="145" height="96" rx="18" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700 transition-colors" strokeWidth="1" />
          
          <rect x="12" y="12" width="32" height="32" rx="10" className="fill-sky-50 dark:fill-sky-950/60" />
          <path d="M 22 36 L 22 20 L 34 20 L 34 36 Z M 25 24 H 27 M 29 24 H 31 M 25 28 H 27 M 29 28 H 31" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Stars */}
          <g fill="#F59E0B" transform="translate(52, 16)">
            <polygon points="5,0 6.5,3.2 10,3.6 7.5,6.1 8.1,9.6 5,8 1.9,9.6 2.5,6.1 0,3.6 3.5,3.2" transform="scale(0.8)" />
            <polygon points="17,0 18.5,3.2 22,3.6 19.5,6.1 20.1,9.6 17,8 13.9,9.6 14.5,6.1 12,3.6 15.5,3.2" transform="scale(0.8)" />
            <polygon points="29,0 30.5,3.2 34,3.6 31.5,6.1 32.1,9.6 29,8 25.9,9.6 26.5,6.1 24,3.6 27.5,3.2" transform="scale(0.8)" />
          </g>

          <text x="52" y="34" className="fill-slate-900 dark:fill-white font-bold" fontSize="10" fontFamily="system-ui, sans-serif">Grand Riviera</text>
          <text x="14" y="60" className="fill-slate-500 dark:fill-slate-400" fontSize="9" fontFamily="system-ui, sans-serif">Goa • Ocean Suite</text>
          
          <rect x="12" y="68" width="60" height="16" rx="8" className="fill-emerald-50 dark:fill-emerald-950/60" />
          <text x="20" y="80" className="fill-emerald-700 dark:fill-emerald-400 font-bold" fontSize="8" fontFamily="system-ui, sans-serif">Verified Stay</text>
          
          <text x="94" y="80" className="fill-slate-900 dark:fill-white font-extrabold" fontSize="11" fontFamily="system-ui, sans-serif">₹4,200</text>
        </g>

        {/* Floating Right Card: Real-Time Currency Exchange Pill */}
        <g transform="translate(365, 220)" filter="url(#badgeShadow)">
          <rect width="140" height="88" rx="18" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700 transition-colors" strokeWidth="1" />
          
          <rect x="12" y="12" width="28" height="28" rx="9" className="fill-amber-50 dark:fill-amber-950/60" />
          <text x="21" y="30" fill="#D97706" fontSize="12" fontWeight="bold" fontFamily="system-ui, sans-serif">₹</text>

          <text x="48" y="24" className="fill-slate-500 dark:fill-slate-400" fontSize="9" fontFamily="system-ui, sans-serif">Live Dual-Currency</text>
          <text x="48" y="38" className="fill-slate-900 dark:fill-white font-bold" fontSize="12" fontFamily="system-ui, sans-serif">INR ⇄ USD / EUR</text>
          
          <g transform="translate(12, 52)">
            <rect width="116" height="24" rx="8" className="fill-slate-100 dark:fill-slate-700/60" />
            <circle cx="16" cy="12" r="5" fill="#10B981" />
            <text x="28" y="16" className="fill-slate-700 dark:fill-slate-300 font-semibold" fontSize="9" fontFamily="system-ui, sans-serif">ECB Bank Rate Sync</text>
          </g>
        </g>

        {/* Location Pin Bottom Left */}
        <g transform="translate(110, 310)" filter="url(#softShadow)">
          <circle cx="18" cy="18" r="18" fill="#6366F1" />
          <path d="M 18 10 C 14.5 10 12 12.5 12 16 C 12 21 18 27 18 27 C 18 27 24 21 24 16 C 24 12.5 21.5 10 18 10 Z M 18 18 C 16.9 18 16 17.1 16 16 C 16 14.9 16.9 14 18 14 C 19.1 14 20 14.9 20 16 C 20 17.1 19.1 18 18 18 Z" fill="#FFFFFF" />
        </g>

        {/* Group Member Floating Avatars */}
        <g transform="translate(370, 115)">
          <circle cx="14" cy="14" r="14" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2.5" />
          <text x="9" y="19" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="system-ui, sans-serif">A</text>
          
          <circle cx="34" cy="14" r="14" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2.5" />
          <text x="29" y="19" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="system-ui, sans-serif">R</text>

          <circle cx="54" cy="14" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
          <text x="50" y="19" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="system-ui, sans-serif">S</text>

          <circle cx="74" cy="14" r="14" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2.5" />
          <text x="68" y="18" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif">+2</text>
        </g>
      </svg>
    </div>
  );
}
