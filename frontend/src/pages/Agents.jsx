import { useState } from 'react'
import { Link } from 'react-router'
import { Server, Plus, Search, ArrowUpRight, ShieldCheck, Activity, Cpu, HardDrive } from 'lucide-react'
import { useData } from '../context/DataContext'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'

export default function Agents() {
  const { agents } = useData()
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = agents.filter((a) => {
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus
    const matchSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.environment.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Migration Agents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agents execute migrations inside your infrastructure without exposing databases to the Internet.
          </p>
        </div>
        <Link
          to="/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add agent</span>
        </Link>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Zero Inbound Ports Required:</strong> All agents initiate encrypted outbound WSS connections to the Control Plane.
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          TLS 1.3 / mTLS Enforced
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs w-fit">
          {['ALL', 'ONLINE', 'OFFLINE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterStatus === st
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agents by name, host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No agents match your filter"
          description="Install a customer-hosted migration agent inside your Kubernetes or Docker cluster."
          actionLabel="Add agent"
          onAction={() => window.location.assign('/agents/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {agent.host}
                    </p>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 border-y border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Version</span>
                    <span className="text-slate-700 dark:text-slate-300">{agent.version}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Environment</span>
                    <span className="text-slate-700 dark:text-slate-300">{agent.environment}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Heartbeat</span>
                    <span className="text-slate-700 dark:text-slate-300">{agent.lastHeartbeat}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Active Jobs</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {agent.activeMigrations} migrations
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-slate-400 font-mono">Uptime: {agent.uptime}</span>
                <Link
                  to={`/agents/${agent.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>View agent</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
