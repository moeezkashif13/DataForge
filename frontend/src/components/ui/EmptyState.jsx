export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 my-4">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400 mb-4 shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
