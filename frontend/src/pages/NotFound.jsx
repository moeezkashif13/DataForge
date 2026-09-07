import { Link } from 'react-router'
import { ArrowLeft, ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        404 — Endpoint Not Found
      </span>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Page Not Found
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
        The requested control plane route does not exist or has been relocated to another workspace partition.
      </p>
      <div className="pt-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
