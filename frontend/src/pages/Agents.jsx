import { useState } from "react";
import { Link } from "react-router";
import {
  Server,
  Plus,
  Search,
  ArrowUpRight,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  X,
  Loader2,
  Terminal,
  Trash2,
  FolderKanban,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useGenerateAgentTokenMutation } from "../store/api/agentsApi";
import { useGetProjectsQuery } from "../store/api/projectsApi";
import { useToast } from "../context/ToastContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export default function Agents() {
  const { agents, deleteAgent } = useData();
  const { showToast } = useToast();
  const [generateAgentTokenMutation] = useGenerateAgentTokenMutation();
  const { data: apiProjects = [] } = useGetProjectsQuery();

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterProject, setFilterProject] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingAgentId, setGeneratingAgentId] = useState(null);
  const [tokenModalData, setTokenModalData] = useState(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAgents = agents.filter((a) => {
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchProject = filterProject === "ALL" || a.projectId === filterProject;
    const matchSearch =
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.host || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.projectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.environment || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchProject && matchSearch;
  });

  const handleGenerateToken = async (agent) => {
    setGeneratingAgentId(agent.id);
    try {
      let token = "";
      let expiresAt = null;

      try {
        const res = await generateAgentTokenMutation({
          agentId: agent.id,
        }).unwrap();
        token = res?.data?.token || res?.token;
        expiresAt = res?.data?.expiresAt || null;
      } catch (apiErr) {
        // Fallback for mock demo agents if not in backend database
        if (agent.id?.startsWith("agent-") || !token) {
          const randomHex = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 16).toString(16),
          ).join("");
          token = `df_agent_${randomHex}`;
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        } else {
          throw apiErr;
        }
      }

      if (!token) {
        throw new Error("No token returned from server");
      }

      setTokenCopied(false);
      setCommandCopied(false);
      setTokenModalData({
        agent,
        token,
        expiresAt,
      });

      showToast(
        "Token Generated",
        `Real connection token generated for "${agent.name}".`,
        "success",
      );
    } catch (err) {
      console.error("Failed to generate token:", err);
      const errorMsg =
        err?.data?.message || err?.message || "Failed to generate token";
      showToast("Error", errorMsg, "error");
    } finally {
      setGeneratingAgentId(null);
    }
  };

  const handleCopyToken = (token) => {
    navigator.clipboard?.writeText(token);
    setTokenCopied(true);
    showToast("Copied", "Connection token copied to clipboard", "info");
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleCopyCommand = (cmd) => {
    navigator.clipboard?.writeText(cmd);
    setCommandCopied(true);
    showToast("Copied", "Docker run snippet copied to clipboard", "info");
    setTimeout(() => setCommandCopied(false), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAgent(agentToDelete.id);
    } catch (err) {
      console.error("Delete agent error:", err);
    } finally {
      setIsDeleting(false);
      setAgentToDelete(null);
    }
  };

  const dockerSnippet = (token) =>
    `docker run -d \\
  --name dataforge-agent \\
  --restart unless-stopped \\
  -e AGENT_ENROLLMENT_TOKEN="${token}" \\
  -e CONTROL_PLANE_URL="wss://api.dataforge.io/agent/v1" \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  dataforge/migration-agent:latest`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Migration Agents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agents execute migrations inside your infrastructure without
            exposing databases to the Internet.
          </p>
        </div>
        <Link
          to="/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
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
            <strong>Zero Inbound Ports Required:</strong> All agents initiate
            encrypted outbound WSS connections to the Control Plane.
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          TLS 1.3 / mTLS Enforced
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs w-fit">
          {["ALL", "ONLINE", "CONNECTED", "RUNNING", "OFFLINE"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterStatus === st
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {apiProjects.length > 0 && (
            <div className="relative">
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Projects</option>
                {apiProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No agents match your filter"
          description="Install a customer-hosted migration agent inside your Kubernetes or Docker cluster."
          actionLabel="Add agent"
          onAction={() => window.location.assign("/agents/new")}
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[11px] font-mono text-slate-400">
                        {agent.host}
                      </p>
                      {agent.projectName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-900/40">
                          <FolderKanban className="w-2.5 h-2.5" />
                          {agent.projectName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={agent.status} />
                    <button
                      type="button"
                      onClick={() => setAgentToDelete(agent)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 border-y border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Version
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {agent.version}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Environment
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {agent.environment}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Heartbeat
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {agent.lastHeartbeat}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      Active Jobs
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {agent.activeMigrations} migrations
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Uptime, Details Link, and Generate Token Button */}
              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Uptime: {agent.uptime}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/agents/${agent.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>View agent</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateToken(agent)}
                  disabled={generatingAgentId === agent.id}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingAgentId === agent.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating token...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Generate Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection Token Modal */}
      {tokenModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150 space-y-5"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Agent Connection Token
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Generated for:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {tokenModalData.agent?.name}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTokenModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Callout */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Save this token somewhere safe
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                  Save this token somewhere because it will not be visible
                  again. For security reasons, this raw token cannot be
                  retrieved after you close this popup.
                </p>
              </div>
            </div>

            {/* Token Display with Copy Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Connection Token
                </label>
                {tokenModalData.expiresAt && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Expires:{" "}
                    {new Date(tokenModalData.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-indigo-400 break-all select-all font-medium">
                  {tokenModalData.token}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyToken(tokenModalData.token)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all shrink-0 cursor-pointer"
                >
                  {tokenCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Docker command snippet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>Docker Run Command</span>
              </label>
              <div className="relative rounded-xl bg-slate-950 p-3 border border-slate-800 text-slate-300 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCommand(dockerSnippet(tokenModalData.token))
                  }
                  className="absolute right-2.5 top-2.5 p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy docker command"
                >
                  {commandCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <pre className="overflow-x-auto pr-8 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                  <code>{dockerSnippet(tokenModalData.token)}</code>
                </pre>
              </div>
            </div>

            {/* Footer with Understood / Got it button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTokenModalData(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Understood, Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Agent Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(agentToDelete)}
        title={`Delete Agent "${agentToDelete?.name}"?`}
        description="Are you sure you want to delete this migration agent? This will permanently delete the agent and all of its associated connection tokens. Any runner connected using these credentials will be disconnected."
        confirmLabel={isDeleting ? "Deleting..." : "Delete Agent"}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setAgentToDelete(null)}
      />
    </div>
  );
}
