export function StatusBadge({ status, size = 'sm' }) {
  const norm = String(status || '').toUpperCase()

  const config = {
    // Migration states
    RUNNING: {
      label: 'Running',
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      dot: 'bg-emerald-500 animate-pulse',
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
      dot: 'bg-teal-500',
    },
    FAILED: {
      label: 'Failed',
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
      dot: 'bg-rose-500',
    },
    PAUSED: {
      label: 'Paused',
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
      dot: 'bg-amber-500',
    },
    QUEUED: {
      label: 'Queued',
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
      dot: 'bg-slate-400',
    },
    READY: {
      label: 'Ready',
      bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
      dot: 'bg-cyan-500',
    },
    DRAFT: {
      label: 'Draft',
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
      dot: 'bg-slate-400',
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
      dot: 'bg-zinc-400',
    },
    // Agent states
    ONLINE: {
      label: 'Online',
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      dot: 'bg-emerald-500 animate-pulse',
    },
    OFFLINE: {
      label: 'Offline',
      bg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
      dot: 'bg-zinc-400',
    },
    CONNECTING: {
      label: 'Connecting',
      bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
      dot: 'bg-cyan-500 animate-ping',
    },
    UPDATING: {
      label: 'Updating',
      bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
      dot: 'bg-indigo-500 animate-pulse',
    },
    // Connection states
    HEALTHY: {
      label: 'Healthy',
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      dot: 'bg-emerald-500',
    },
    DEGRADED: {
      label: 'Degraded',
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
      dot: 'bg-amber-500',
    },
  }

  const current = config[norm] || {
    label: norm || 'Unknown',
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
    dot: 'bg-slate-400',
  }

  const sizeClasses = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase font-mono ${sizeClasses} ${current.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />
      {current.label}
    </span>
  )
}
