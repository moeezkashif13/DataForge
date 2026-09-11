import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import {
  ArrowRightLeft,
  Play,
  Pause,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Search,
  Copy,
  Download,
  Terminal,
  Activity,
  Settings,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  useGetMigrationByIdQuery,
  useDeleteMigrationMutation,
} from '../store/api/migrationsApi'
import { useData } from '../context/DataContext'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function MigrationDetail() {
  const { migrationId } = useParams()
  const navigate = useNavigate()
  const { data: migration, isLoading, isError } = useGetMigrationByIdQuery(migrationId)
  const [deleteMigration, { isLoading: isDeleting }] = useDeleteMigrationMutation()
  const { startMigration, pauseMigration, resumeMigration, cancelMigration, logs } = useData()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('Overview')
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [logFilter, setLogFilter] = useState('ALL')
  const [logSearch, setLogSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)

  const logContainerRef = useRef(null)

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n || 0)

  const filteredLogs = logs.filter((l) => {
    const matchLevel = logFilter === 'ALL' || l.level === logFilter
    const matchSearch = l.message.toLowerCase().includes(logSearch.toLowerCase()) || l.source.toLowerCase().includes(logSearch.toLowerCase())
    return matchLevel && matchSearch
  })

  const handleConfirmDelete = async () => {
    if (!migration) return
    try {
      await deleteMigration(migration.id).unwrap()
      showToast('Migration Deleted', `Migration "${migration.name}" was deleted successfully.`, 'success')
      setIsDeleteModalOpen(false)
      navigate('/migrations')
    } catch (err) {
      showToast('Delete Failed', err?.data?.message || err?.message || 'Failed to delete migration', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-medium">Loading migration details...</p>
      </div>
    )
  }

  if (isError || !migration) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Migrations', to: '/migrations' }, { label: 'Not Found' }]} />
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-base font-bold text-slate-900 dark:text-white">Migration Not Found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            The requested migration could not be found or you do not have permission to view it.
          </p>
          <Link
            to="/migrations"
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Back to Migrations
          </Link>
        </div>
      </div>
    )
  }

  const copyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.time}] ${l.level} (${l.source}): ${l.message}`).join('\n')
    navigator.clipboard?.writeText(text)
    showToast('Logs Copied', 'All filtered logs copied to clipboard.', 'info')
  }

  const downloadLogs = () => {
    const text = filteredLogs.map((l) => `[${l.time}] ${l.level} (${l.source}): ${l.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${migration.id}-logs.txt`
    a.click()
    showToast('Download Started', 'Exporting log file...', 'info')
  }

  const tabs = [
    { name: 'Overview' },
    { name: 'Progress' },
    { name: 'Logs', badge: filteredLogs.length },
    { name: 'Errors', badge: migration.recordsFailed > 0 ? migration.recordsFailed : null },
    { name: 'Configuration' },
    { name: 'Activity' },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Migrations', to: '/migrations' },
          { label: migration.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {migration.name}
            </h1>
            <StatusBadge status={migration.status} size="md" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Project: {migration.projectName}</span>
            <span>·</span>
            <span>Agent: {migration.agentName}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {migration.status === 'READY' && (
            <button
              type="button"
              onClick={() => startMigration(migration.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Execution</span>
            </button>
          )}

          {migration.status === 'RUNNING' && (
            <>
              <button
                type="button"
                onClick={() => pauseMigration(migration.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs active:scale-95 transition-all"
              >
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-400 active:scale-95 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </>
          )}

          {migration.status === 'PAUSED' && (
            <>
              <button
                type="button"
                onClick={() => resumeMigration(migration.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </>
          )}

          {migration.status === 'COMPLETED' && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Finished Successfully
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 active:scale-95 transition-all"
            title="Delete migration"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Hero Progress Visualization */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Migration Progress
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                {(Number(migration?.progress) || 0).toFixed(1)}%
              </span>
              <span className="text-sm font-mono text-slate-500">
                {formatNumber(migration?.recordsProcessed)} / {formatNumber(migration?.recordsTotal)} records
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span>Started: {migration?.startedAt}</span>
            <span>·</span>
            <span>Elapsed: {migration?.elapsed}</span>
            <span>·</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">ETA: {migration?.eta}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              migration?.status === 'COMPLETED'
                ? 'bg-teal-500'
                : migration?.status === 'PAUSED'
                ? 'bg-amber-500'
                : migration?.status === 'FAILED'
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400'
            }`}
            style={{ width: `${Math.min(100, Number(migration?.progress) || 0)}%` }}
          />
        </div>

        {/* 4 Telemetry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Records Processed</span>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {formatNumber(migration.recordsProcessed)}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Records Succeeded</span>
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatNumber(migration.recordsSucceeded)}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Records Failed</span>
            <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              {formatNumber(migration.recordsFailed)}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Throughput</span>
            <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {migration.throughput} <span className="text-xs font-normal text-slate-400">rec/sec</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name
          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.name}</span>
              {typeof tab.badge === 'number' && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Batch &amp; Checkpoint Status</h3>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Current Checkpoint</span>
                  <span className="text-slate-800 dark:text-slate-200">{migration.checkpoint}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Batch Size</span>
                  <span className="text-slate-800 dark:text-slate-200">{migration.batchSize} records/batch</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Retry Count</span>
                  <span className="text-slate-800 dark:text-slate-200">{migration.retries} retries</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Resumable</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yes (WAL offset backed)</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Execution Agent Telemetry</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Agent Node</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{migration.agentName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Heartbeat Interval</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">5 seconds (OK)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Data Boundary</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Customer VPC Internal
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'Progress' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Throughput Rate Over Time</h3>
              <p className="text-xs text-slate-500 mt-0.5">Records stream rate processed per second by local worker pool.</p>
            </div>

            {/* Simulated Rate Chart Graphic */}
            <div className="h-44 w-full flex items-end gap-2 pt-6 pb-2 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              {[420, 580, 640, 710, 680, 720, 696, 730, 690, 705, 696, 712, 696].map((rate, i) => {
                const heightPct = Math.round((rate / 800) * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div
                      className="w-full rounded-t-md bg-indigo-500/70 group-hover:bg-indigo-500 transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-slate-400">{i * 2}m</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 font-mono text-center">
              Average throughput: 698 rec/sec · Max recorded: 730 rec/sec
            </p>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'Logs' && (
          <div className="rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 p-4 space-y-3 font-mono text-xs shadow-xl">
            {/* Log Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 font-sans">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLogFilter(lvl)}
                      className={`px-2 py-0.5 rounded ${
                        logFilter === lvl ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span>Auto-scroll</span>
                </label>
                <button
                  type="button"
                  onClick={copyLogs}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Copy logs"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={downloadLogs}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Download logs"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Log Stream Body */}
            <div
              ref={logContainerRef}
              className="h-80 overflow-y-auto space-y-1.5 pr-2 font-mono text-[11px] leading-relaxed select-text"
            >
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-slate-900/60 p-1 rounded">
                  <span className="text-slate-500 shrink-0">{log.time}</span>
                  <span
                    className={`font-semibold shrink-0 w-12 ${
                      log.level === 'INFO'
                        ? 'text-cyan-400'
                        : log.level === 'WARN'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-400 shrink-0">[{log.source}]</span>
                  <span className="text-slate-200 flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ERRORS TAB */}
        {activeTab === 'Errors' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Validation &amp; Schema Issues</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Records failing normalization rules quarantined to error dead-letter partition.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast('Retried', 'Dead-letter partition re-queued.', 'success')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Failed Records</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="p-4 flex items-start gap-3 bg-rose-50/30 dark:bg-rose-950/20">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Phone number formatting exception (1,488 rows)
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Field <code>phone</code> had non-conforming characters that failed <code>normalizePhone()</code>.
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                    Partition: /var/data/quarantine/mig_customers_batch14.jsonl
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURATION TAB */}
        {activeTab === 'Configuration' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Safe Configuration Manifest</h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-mono">
              <p>Credentials: Stored securely in customer AWS Secrets Manager (Vault ARN: arn:aws:secretsmanager:***)</p>
              <p className="mt-1 text-slate-400">DataRelay control plane never receives or stores database passwords.</p>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'Activity' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Job Audit Trail</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Execution Resumed</p>
                  <p className="text-slate-500">Agent verified checkpoint chkpt_b294 and began streaming batches.</p>
                  <span className="text-[10px] text-slate-400 font-mono">14 minutes ago by Abdul Moeez</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelModalOpen}
        title="Cancel this migration?"
        description="The migration agent will stop processing batches immediately. Completed batches will remain committed in the target database."
        confirmLabel="Cancel Migration"
        isDestructive={true}
        onConfirm={() => {
          cancelMigration(migration.id)
          setIsCancelModalOpen(false)
        }}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Delete this migration?"
        description={`Are you sure you want to delete "${migration?.name}"? This action cannot be undone and will permanently remove this migration.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete Migration"}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  )
}
