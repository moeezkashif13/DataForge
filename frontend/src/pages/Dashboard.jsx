import { Link } from "react-router";
import {
  ArrowRightLeft,
  Server,
  Layers,
  Database,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  HardDrive,
  Cpu,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { StatusBadge } from "../components/ui/StatusBadge";

export default function Dashboard() {
  // const { migrations, agents, activities } = useData()

  // const runningMigrations = migrations.filter((m) => m.status === 'RUNNING' || m.status === 'PAUSED')
  // const onlineAgents = agents.filter((a) => a.status === 'ONLINE').length
  // const totalAgents = agents.length

  // // Calculate live total records from mock
  // const totalRecordsMigrated = migrations.reduce((acc, m) => acc + (m.recordsProcessed || 0), 0)

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Good morning, Abdul
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s what&apos;s happening across your data infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/agents/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Enroll Agent</span>
          </Link>
          <Link
            to="/migrations/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Create Migration</span>
          </Link>
        </div>
      </div>

      {/* Top Level Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Migrations</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {/* {runningMigrations.length} */} 300
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-0.5">
              <TrendingUp className="w-3 h-3" /> +2 this week
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            2 executing, 1 paused at checkpoint
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Migrations</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              128
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-0.5">
              <TrendingUp className="w-3 h-3" /> +14 this week
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            98.4% success rate across all jobs
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Records Migrated</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {/* {(totalRecordsMigrated / 1000000).toFixed(2)}M */}
              20
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-0.5">
              <TrendingUp className="w-3 h-3" /> +18.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Direct engine stream across VPC
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Agents Online</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {/* {onlineAgents} / {totalAgents} */}
              0/ 20
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {/* {Math.round((onlineAgents / totalAgents) * 100)}% */}
              50%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            4 verified heartbeat responses
          </p>
        </div>
      </div>

      {/* Main Grid: Active Migrations & Side Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Migrations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Active Migrations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live stream monitoring from customer-hosted migration agents
              </p>
            </div>
            <Link
              to="/migrations"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View all migrations</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* {runningMigrations.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {m.name}
                      </h3>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {m.sourceTargetLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Agent:
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                      {m.agentName}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {m.progress.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">
                      {formatNumber(m.recordsProcessed)} /{" "}
                      {formatNumber(m.recordsTotal)} records
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.status === "PAUSED"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, m.progress)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      ETA: {m.eta}
                    </span>
                    {m.throughput > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        {m.throughput} rec/sec
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/migrations/${m.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>Inspect Migration</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))} */}
            migrations here
          </div>

          {/* Architecture Concept Callout Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/20 text-slate-900 dark:text-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Control Plane + Customer Data Plane Philosophy</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              DataRelay orchestrates configuration, telemetry, and checkpointing
              through secure outbound WebSockets. Your actual database
              credentials, rows, and payloads remain strictly quarantined inside
              your own infrastructure.
            </p>
          </div>
        </div>

        {/* Right Col: Agent Health & Recent Activity */}
        <div className="space-y-6">
          {/* Agent Health List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Agent Health
              </h2>
              <Link
                to="/agents"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage
              </Link>
            </div>

            <div className="space-y-3">
              agents here
              {/* {agents.map((agent) => (
                <Link
                  key={agent.id}
                  to={`/agents/${agent.id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {agent.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {agent.host} · {agent.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={agent.status} />
                  </div>
                </Link>
              ))} */}
            </div>
          </div>

          {/* Recent Activity Stream */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Recent Activity
              </h2>
              <Link
                to="/activity"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              activities here
              {/* {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {act.detail}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {act.timestamp}
                    </span>
                  </div>
                </div>
              ))} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
