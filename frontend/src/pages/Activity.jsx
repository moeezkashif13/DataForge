import { useState } from 'react'
import { Activity as ActivityIcon, Filter, Search, CheckCircle2, AlertTriangle, Play, Server, Code, Shield } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function Activity() {
  const { activities } = useData()
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredActivities = activities.filter((act) => {
    const matchType = filterType === 'ALL' || act.severity.toUpperCase() === filterType
    const matchSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.user.toLowerCase().includes(searchQuery.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Activity Stream
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audit history of migration events, agent connectivity, and configuration changes.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs w-fit">
          {['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ACTIVE'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === f
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Log Timeline</h2>

        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6">
          {filteredActivities.map((act) => (
            <div key={act.id} className="relative pl-6 group">
              {/* Dot */}
              <div
                className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  act.severity === 'success'
                    ? 'bg-emerald-500'
                    : act.severity === 'warning'
                    ? 'bg-amber-500'
                    : act.severity === 'active'
                    ? 'bg-indigo-500 animate-ping'
                    : 'bg-cyan-500'
                }`}
              />

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {act.title}
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {act.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {act.detail}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                  <span>Actor: {act.user}</span>
                  <span>·</span>
                  <span>{act.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
