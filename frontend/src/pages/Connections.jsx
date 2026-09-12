import { useState } from "react";
import {
  Database,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useToast } from "../context/ToastContext";

export default function Connections() {
  const { connections, addConnection, testConnection } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("PostgreSQL");
  const [host, setHost] = useState("");
  const [database, setDatabase] = useState("");
  const [vaultKey, setVaultKey] = useState(
    "arn:aws:secretsmanager:us-east-1:123456:secret/db-creds",
  );
  const { showToast } = useToast();

  const handleTest = async (connId) => {
    setTestingId(connId);
    await testConnection(connId);
    setTestingId(null);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addConnection({
      name: name.trim(),
      type,
      host: host || "internal-db-node.internal",
      database: database || "production",
      managedBy: "Vault / AWS Secrets Manager",
      environment: "Production",
    });
    setName("");
    setHost("");
    setDatabase("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Data Connections
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage database and storage endpoints. Credentials remain
            quarantined inside your secret manager.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add connection</span>
        </button>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            <strong>Zero-Knowledge Secrets:</strong> DataForge never stores raw
            database passwords. All authentication resolves at runtime by the
            local customer-hosted agent.
          </span>
        </div>
        <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
          Encrypted Metadata Only
        </span>
      </div>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {conn.name}
                  </h3>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                    {conn.type}
                  </span>
                </div>
                <StatusBadge status={conn.status} />
              </div>

              <div className="space-y-1.5 text-xs font-mono py-2 border-y border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Host / Target</span>
                  <span className="truncate max-w-[170px]">
                    {conn.host || conn.filePath}
                  </span>
                </div>
                {conn.database && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database</span>
                    <span>{conn.database}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Latency</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {conn.latencyMs}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Tested</span>
                  <span className="text-slate-500">{conn.lastTested}</span>
                </div>
              </div>

              {/* Secret Manager Protection Indicator */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-[11px] space-y-1">
                <span className="text-slate-400 font-semibold block">
                  Credential Security
                </span>
                <p className="text-slate-600 dark:text-slate-400 font-mono truncate">
                  Password: ••••••••••••
                </p>
                <span className="text-[10px] text-slate-400 block">
                  {conn.managedBy}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTest(conn.id)}
                disabled={testingId === conn.id}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${testingId === conn.id ? "animate-spin" : ""}`}
                />
                <span>
                  {testingId === conn.id ? "Probing..." : "Test Connection"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Rotate Credential",
                    "Dispatching rotation request to your Secret Vault...",
                    "info",
                  )
                }
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Rotate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Connection Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure connection parameters for internal database endpoints.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Connection Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Analytics PostgreSQL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Database Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MySQL">MySQL</option>
                  <option value="S3">Amazon S3</option>
                  <option value="CSV">Mounted CSV</option>
                  <option value="JSON">Mounted JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Host / VPC Endpoint
                </label>
                <input
                  type="text"
                  placeholder="e.g. postgres-prod.internal.company"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secret Manager Key / Vault Reference
                </label>
                <input
                  type="text"
                  value={vaultKey}
                  onChange={(e) => setVaultKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Reference resolved by the agent locally. No credentials sent
                  to DataForge.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Add Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
