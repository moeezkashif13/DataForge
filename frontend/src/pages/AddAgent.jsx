import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Server,
  KeyRound,
  ShieldCheck,
  Save,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { useToast } from '../context/ToastContext'

export default function AddAgent() {
  const { registerAgent } = useData()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [agentName, setAgentName] = useState('')
  const [environment, setEnvironment] = useState('Production')
  const [host, setHost] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()

    if (!agentName.trim()) {
      showToast('Validation Error', 'Agent name is required', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const newAgent = await registerAgent({
        name: agentName.trim(),
        environment,
        host: host.trim() || 'worker-node-k8s.internal',
        description: description.trim() || 'Customer-hosted migration agent',
      })

      if (newAgent) {
        showToast(
          'Agent Created',
          `Agent "${agentName.trim()}" created successfully. You can now generate a connection token.`,
          'success'
        )
        navigate('/agents')
      }
    } catch (err) {
      console.error('Agent creation error:', err)
      const errorMsg =
        err?.data?.message || err?.message || 'Failed to create agent'
      showToast('Error', errorMsg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Agents', to: '/agents' },
          { label: 'Add Migration Agent' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Add Migration Agent
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register a customer-hosted worker node. Execution occurs locally inside your private subnet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Agents</span>
        </button>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Zero Inbound Ports:</strong> Agents establish an encrypted outbound-only WebSocket (mTLS) to the Control Plane.
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          TLS 1.3 Enforced
        </span>
      </div>

      {/* Agent Creation Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Agent Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define the identification and network scope for this execution runner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Agent Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Production Worker US-East"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Environment <span className="text-rose-500">*</span>
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Host / Node Identifier <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. worker-node-k8s-01.internal"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Customer-hosted execution worker running inside private VPC subnet."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Enrollment Token Information Notice */}
        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Connecting your agent after creation</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            Once you click <strong>Save Agent</strong>, this agent record will be registered in your organization. You can then click the <strong>Generate Token</strong> button on the agent card in the Agents dashboard to issue a secure, real connection token and container deployment snippet.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => navigate('/agents')}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !agentName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving agent...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Agent</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
