import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRightLeft,
  Plus,
  Search,
  ArrowUpRight,
  Database,
  Server,
  Clock,
  Play,
  Pause,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

export default function Migrations() {
  const { migrations, startMigration, pauseMigration, resumeMigration, cancelMigration } = useData()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMigForCancel, setSelectedMigForCancel] = useState(null)

  const filteredMigrations = migrations.filter((m) => {
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sourceTargetLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.agentName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Migrations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, monitor, and manage your data movement jobs across customer infrastructure.
          </p>
        </div>
        <Link
          to="/migrations/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create migration</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
          {['ALL', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED', 'QUEUED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search migration, project, agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Migrations Table */}
      {filteredMigrations.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No migrations match your query"
          description="Try broadening your status filter or search parameters, or configure a new migration job."
          actionLabel="Create migration"
          onAction={() => window.location.assign('/migrations/new')}
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Migration</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Source → Target</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4">Last Run</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMigrations.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/migrations/${m.id}`}
                        className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block"
                      >
                        {m.name}
                      </Link>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {m.fieldMappingsCount} fields mapped
                      </span>
                    </td>

                    {/* Project */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {m.projectName}
                    </td>

                    {/* Source & Target */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.sourceType}
                        </span>
                        <span>→</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.targetType}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} />
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {m.progress.toFixed(1)}%
                          </span>
                          <span className="text-slate-400">
                            {formatNumber(m.recordsProcessed)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.status === 'COMPLETED'
                                ? 'bg-teal-500'
                                : m.status === 'PAUSED'
                                ? 'bg-amber-500'
                                : m.status === 'FAILED'
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, m.progress)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.agentName}</span>
                      </div>
                    </td>

                    {/* Last run */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {m.lastRun}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.status === 'RUNNING' && (
                          <button
                            type="button"
                            title="Pause migration"
                            onClick={() => pauseMigration(m.id)}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {m.status === 'PAUSED' && (
                          <button
                            type="button"
                            title="Resume migration"
                            onClick={() => resumeMigration(m.id)}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(m.status === 'RUNNING' || m.status === 'PAUSED') && (
                          <button
                            type="button"
                            title="Cancel migration"
                            onClick={() => setSelectedMigForCancel(m)}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link
                          to={`/migrations/${m.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(selectedMigForCancel)}
        title="Cancel migration?"
        description={`The agent will stop processing new batches for "${selectedMigForCancel?.name}". Checkpoints will be retained.`}
        confirmLabel="Cancel Migration"
        isDestructive={true}
        onConfirm={() => {
          if (selectedMigForCancel) {
            cancelMigration(selectedMigForCancel.id)
            setSelectedMigForCancel(null)
          }
        }}
        onCancel={() => setSelectedMigForCancel(null)}
      />
    </div>
  )
}
