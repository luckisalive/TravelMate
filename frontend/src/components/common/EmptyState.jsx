import React from 'react';
import EmptyIllustration from '../illustrations/EmptyIllustration';

export default function EmptyState({
  icon: Icon,
  iconBg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  illustration: Illustration,
  showIllustration = false,
  badge,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-200/90 dark:border-slate-800 shadow-xs max-w-lg mx-auto space-y-4 animate-in fade-in duration-200 ${className}`}
    >
      {Illustration ? (
        <Illustration className="w-48 h-36 mx-auto mb-2" />
      ) : showIllustration ? (
        <EmptyIllustration className="w-48 h-36 mx-auto mb-2" />
      ) : Icon ? (
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xs ${iconBg}`}
        >
          <Icon className="w-8 h-8" />
        </div>
      ) : null}

      {badge && (
        <div>
          <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {badge}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
