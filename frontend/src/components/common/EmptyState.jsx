import React from 'react';

export default function EmptyState({
  icon: Icon,
  iconBg = 'bg-indigo-50 text-indigo-600',
  badge,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) {
  return (
    <div
      className={`bg-white rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-200 shadow-xs max-w-lg mx-auto space-y-4 animate-in fade-in duration-200 ${className}`}
    >
      {Icon && (
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xs ${iconBg}`}
        >
          <Icon className="w-8 h-8" />
        </div>
      )}

      {badge && (
        <div>
          <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-600">
            {badge}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-slate-800">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
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
