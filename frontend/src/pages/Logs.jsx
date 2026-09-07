import { useState, useRef, useEffect } from 'react'
import { FileText, Search, Copy, Download, Filter, Terminal } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'

export default function Logs() {
  const { logs } = useData()
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(false)
  const { showToast } = useToast()
  const containerRef = useRef(null)

  const sources = ['ALL', ...new Set(logs.map((l) => l.source))]

  const filteredLogs = logs.filter((log) => {
    const matchLevel = levelFilter === 'ALL' || log.level === levelFilter
    const matchSource = sourceFilter === 'ALL' || log.source === sourceFilter
    const matchSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase())
    return matchLevel && matchSource && matchSearch
  })

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const copyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.time}] [${l.level}] [${l.source}] ${l.message}`).join('\n')
    navigator.clipboard?.writeText(text)
    showToast('Logs Copied', `${filteredLogs.length} lines copied to clipboard.`, 'info')
  }

  const downloadLogs = () => {
    const text = filteredLogs.map((l) => `[${l.time}] [${l.level}] [${l.source}] ${l.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `datarelay-logs-${Date.now()}.txt`
    a.click()
    showToast('Download Started', 'Exporting log file...', 'info')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Log Explorer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry and execution logs streamed from customer-hosted migration agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
          <button
            type="button"
            onClick={downloadLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-scroll toggle */}
          <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer pl-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            <span>Follow tail</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search log output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 shadow-2xl font-mono text-xs text-slate-200 space-y-2">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-[11px] text-slate-500">
          <span>Stream: /var/log/datarelay/control-plane.log</span>
          <span>{filteredLogs.length} events matching filter</span>
        </div>

        <div ref={containerRef} className="h-[460px] overflow-y-auto space-y-1 pr-2 select-text text-[11px]">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 hover:bg-slate-900/60 py-0.5 px-1.5 rounded">
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
              <span className="text-slate-200 flex-1 leading-relaxed">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
