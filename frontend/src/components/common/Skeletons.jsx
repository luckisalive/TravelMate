import React from 'react';

export function TripCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-14 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
        </div>
        <div className="h-6 w-6 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
      </div>

      <div className="space-y-2 pt-1">
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>

      <div className="pt-3 space-y-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="flex justify-between">
          <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </div>
  );
}

export function TripsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TripDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl p-6 sm:p-8 h-48 sm:h-56 flex flex-col justify-between border border-slate-200 dark:border-slate-700">
        <div className="space-y-3">
          <div className="h-5 w-28 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <div className="h-8 sm:h-10 w-2/3 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-4 w-1/3 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 w-28 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-9 w-28 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-9 w-28 bg-slate-300 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>

      {/* Tabs & Content Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-9 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        </div>

        {/* Analytics & Expenses Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 h-80 flex flex-col items-center justify-center space-y-4">
            <div className="w-40 h-40 rounded-full border-8 border-slate-100 dark:border-slate-800 border-t-slate-200 dark:border-t-slate-700" />
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BalancesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Standing Banner Skeleton */}
      <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl p-6 sm:p-8 h-40 flex flex-col justify-between border border-slate-200 dark:border-slate-700">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-300 dark:bg-slate-700 rounded" />
          <div className="h-8 w-48 bg-slate-300 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="h-4 w-40 bg-slate-300 dark:bg-slate-700 rounded" />
      </div>

      {/* Suggested Settlements Skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
              </div>
              <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Companion Table Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItinerarySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Day Selector Pills */}
      <div className="flex gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Timeline Activities */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 w-full">
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="h-6 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingsListSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FlightSeatMapSkeleton() {
  return (
    <div className="w-full flex flex-col items-center animate-pulse py-4">
      <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[50px_50px_20px_20px] p-6 space-y-3">
        <div className="w-24 h-8 bg-slate-200 dark:bg-slate-800 rounded-t-full mx-auto" />
        <div className="w-full grid grid-cols-7 gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-4 bg-slate-200 dark:bg-slate-800 rounded mx-1" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="grid grid-cols-7 gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto" />
            ))}
            <div className="flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-600 font-mono">
              {row}
            </div>
            {[4, 5, 6].map((s) => (
              <div key={s} className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewsListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-700/60 rounded ml-9" />
        </div>
      ))}
    </div>
  );
}
