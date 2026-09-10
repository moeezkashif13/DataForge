import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Network,
  ShieldCheck,
  Clock,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  Terminal,
  Trash2,
  Loader2,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useGetAgentByIdQuery } from "../store/api/agentsApi";

export default function AgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { agents, migrations, activities, deleteAgent } = useData();
  const { data: apiAgent } = useGetAgentByIdQuery(agentId, { skip: !agentId });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const agent = apiAgent || agents.find((a) => a.id === agentId) || agents[0];

  const agentMigrations = migrations.filter((m) => m.agentId === agent?.id);
  const agentActivities = activities.filter(
    (act) =>
      act.detail.includes(agent?.name || "") || act.title.includes("Agent"),
  );

  const handleDeleteAgent = async () => {
    if (!agent) return;
    setIsDeleting(true);
    try {
      await deleteAgent(agent.id);
      navigate('/agents');
    } catch (err) {
      console.error('Failed to delete agent:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <Server className="w-8 h-8 text-slate-400 animate-pulse" />
        <p className="text-sm font-medium text-slate-500">
          Loading agent details...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Agents", to: "/agents" },
          { label: agent?.name || "Agent" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {agent?.name}
              </h1>
              <StatusBadge status={agent?.status} size="md" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500 mr-1">
            Heartbeat: {agent.lastHeartbeat}
          </span>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Agent</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Utilization</span>
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {agent.cpuUsage}
          </p>
          <p className="text-[10px] text-slate-400">Worker process pool</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Memory Allocated</span>
            <HardDrive className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {agent.memUsage}
          </p>
          <p className="text-[10px] text-slate-400">Resident memory heap</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Network Egress</span>
            <Network className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {agent.networkEgress}
          </p>
          <p className="text-[10px] text-slate-400">Internal subnet stream</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Container Uptime</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {agent.uptime}
          </p>
          <p className="text-[10px] text-slate-400">0 crash restarts</p>
        </div>
      </div>

      {/* Main 2-Column: Active Migrations & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Migrations */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Active Workloads
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {agentMigrations.length} assigned
            </span>
          </div>

          <div className="space-y-3">
            {agentMigrations.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No active migrations assigned to this agent.
              </p>
            ) : (
              agentMigrations.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/migrations/${m.id}`}
                        className="font-semibold text-xs text-slate-900 dark:text-white hover:underline"
                      >
                        {m.name}
                      </Link>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {m.sourceTargetLabel}
                    </p>
                  </div>
                  <Link
                    to={`/migrations/${m.id}`}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>View</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Agent Audit Log
          </h2>
          <div className="space-y-3 text-xs">
            {agentActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {act.title}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {act.detail}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {act.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safe Configuration View */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Safe Configuration Manifest
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 text-[10px] block mb-1">
              Docker Image
            </span>
            <span className="text-slate-800 dark:text-slate-200">
              {agent.dockerImage}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 text-[10px] block mb-1">
              mTLS Certificate Status
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              Valid (Expires in 89 days)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 text-[10px] block mb-1">
              Inbound Port Exposure
            </span>
            <span className="text-slate-800 dark:text-slate-200">
              0 open ports (Egress only)
            </span>
          </div>
        </div>
      </div>

      {/* Delete Agent Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`Delete Agent "${agent?.name}"?`}
        description="Are you sure you want to delete this migration agent? This will permanently remove the agent and revoke all associated connection tokens."
        confirmLabel={isDeleting ? "Deleting..." : "Delete Agent"}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteAgent}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
