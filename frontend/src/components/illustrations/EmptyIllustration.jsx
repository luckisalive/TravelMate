import React from 'react';

/**
 * Modern flat vector empty-state illustration.
 * Features an illustrated travel backpack, camera, passport, map pin, and sunglasses.
 */
export default function EmptyIllustration({ className = 'w-48 h-36 mx-auto' }) {
  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="bagGrad" x1="80" y1="40" x2="160" y2="150" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="pocketGrad" x1="90" y1="80" x2="150" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="groundGlow" x1="30" y1="160" x2="210" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E2E8F0" />
            <stop offset="0.5" stopColor="#CBD5E1" />
            <stop offset="1" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* Soft Ground Shadow */}
        <ellipse cx="120" cy="162" rx="85" ry="10" fill="url(#groundGlow)" opacity="0.6" />

        {/* Passport / Ticket leaning on Left */}
        <g transform="translate(45, 80) rotate(-14)">
          <rect width="44" height="64" rx="6" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
          <circle cx="22" cy="24" r="10" fill="#BAE6FD" opacity="0.4" />
          <path d="M 22 17 C 25.5 17 28 20 28 24 C 28 29 22 34 22 34 C 22 34 16 29 16 24 C 16 20 18.5 17 22 17 Z" fill="#FFFFFF" />
          <rect x="8" y="44" width="28" height="3" rx="1.5" fill="#E0F2FE" />
          <rect x="8" y="50" width="18" height="3" rx="1.5" fill="#E0F2FE" opacity="0.7" />
        </g>

        {/* Travel Backpack Center */}
        <g transform="translate(85, 35)">
          {/* Top Handle */}
          <path d="M 22 15 C 22 2, 48 2, 48 15" stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" fill="none" />
          
          {/* Main Body */}
          <path d="M 8 18 C 8 10, 62 10, 62 18 L 66 115 C 66 122, 4 122, 4 115 Z" fill="url(#bagGrad)" />
          
          {/* Top Flap */}
          <path d="M 6 18 C 6 12, 64 12, 64 18 L 60 52 C 60 56, 10 56, 10 52 Z" fill="#1E3A8A" />
          <rect x="31" y="44" width="8" height="12" rx="2" fill="#F59E0B" />

          {/* Front Pocket */}
          <rect x="14" y="66" width="42" height="42" rx="8" fill="url(#pocketGrad)" />
          <path d="M 14 74 L 56 74" stroke="#1D4ED8" strokeWidth="2" />
          <circle cx="35" cy="74" r="3" fill="#FDE047" />

          {/* Side Pocket Left */}
          <rect x="0" y="70" width="8" height="32" rx="4" fill="#1E40AF" />
          {/* Water Bottle sticking out */}
          <rect x="1" y="56" width="6" height="18" rx="2" fill="#38BDF8" />
          <rect x="2" y="52" width="4" height="4" rx="1" fill="#0284C7" />

          {/* Side Pocket Right */}
          <rect x="62" y="70" width="8" height="32" rx="4" fill="#1E40AF" />
        </g>

        {/* Sunglasses in front */}
        <g transform="translate(135, 125) rotate(8)">
          <rect x="0" y="4" width="22" height="15" rx="5" fill="#0F172A" />
          <rect x="26" y="4" width="22" height="15" rx="5" fill="#0F172A" />
          <path d="M 22 8 Q 24 5 26 8" stroke="#0F172A" strokeWidth="2" fill="none" />
          {/* Lens reflection */}
          <path d="M 4 8 L 10 14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 30 8 L 36 14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Floating Sparkles & Compass Accent */}
        <g transform="translate(175, 45)">
          <circle cx="14" cy="14" r="14" fill="#FEF3C7" />
          {/* Compass Needle */}
          <polygon points="14,6 18,14 14,12" fill="#EF4444" />
          <polygon points="14,22 18,14 14,12" fill="#64748B" />
          <polygon points="14,6 10,14 14,12" fill="#DC2626" />
          <polygon points="14,22 10,14 14,12" fill="#475569" />
          <circle cx="14" cy="14" r="2" fill="#FFFFFF" />
        </g>

        {/* Modern Accent Dots */}
        <circle cx="50" cy="50" r="3" fill="#A5B4FC" opacity="0.6" />
        <circle cx="195" cy="100" r="2.5" fill="#67E8F9" opacity="0.6" />
        <circle cx="35" cy="120" r="2" fill="#FCD34D" opacity="0.8" />
      </svg>
    </div>
  );
}
