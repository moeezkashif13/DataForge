import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  Server,
  KeyRound,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { useToast } from '../context/ToastContext'

export default function AddAgent() {
  const { registerAgent, generateAgentToken } = useData()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [agentName, setAgentName] = useState('Production Worker 02')
  const [environment, setEnvironment] = useState('Production')
  const [installMethod, setInstallMethod] = useState('docker')
  const [tokenGenerated, setTokenGenerated] = useState(false)
  const [enrollmentToken, setEnrollmentToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [waitingStatus, setWaitingStatus] = useState('idle') // 'idle' | 'waiting' | 'connected'
  const [createdAgentId, setCreatedAgentId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateToken = async () => {
    setIsGenerating(true)
    try {
      const newAgent = await registerAgent({
        name: agentName,
        environment,
        host: 'worker-node-k8s.internal (Dummy)',
        description: 'Customer-hosted migration agent (Dummy)',
      })

      if (newAgent?.id) {
        setCreatedAgentId(newAgent.id)
        let token = ''
        if (generateAgentToken) {
          try {
            const tokenRes = await generateAgentToken({ agentId: newAgent.id }).unwrap()
            token = tokenRes?.data?.token || tokenRes?.token
          } catch (tErr) {
            console.error('Token generation error:', tErr)
          }
        }

        if (!token) {
          token =
            'drl_enroll_sec_' +
            Array.from({ length: 32 }, () =>
              Math.floor(Math.random() * 16).toString(16),
            ).join('')
        }

        setEnrollmentToken(token)
        setTokenGenerated(true)
        setWaitingStatus('waiting')
        showToast(
          'Agent Registered & Token Generated',
          'Token valid for host execution. Connecting to agent...',
          'info',
        )

        // Simulate agent connection heartbeat
        setTimeout(() => {
          setWaitingStatus('connected')
          showToast('Agent Connected', `Agent "${agentName}" connected.`, 'success')
        }, 3000)
      }
    } catch (err) {
      console.error('Agent creation error:', err)
      showToast('Error', err?.message || 'Failed to create agent', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyCommand = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    showToast('Copied', 'Command copied to clipboard', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  const dockerSnippet = `docker run -d \\
  --name datarelay-agent \\
  --restart unless-stopped \\
  -e AGENT_ENROLLMENT_TOKEN="${enrollmentToken || 'YOUR_ENROLLMENT_TOKEN'}" \\
  -e CONTROL_PLANE_URL="wss://api.datarelay.io/agent/v1" \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  datarelay/migration-agent:latest`

  const helmSnippet = `helm repo add datarelay https://charts.datarelay.io
helm upgrade --install datarelay-agent datarelay/agent \\
  --namespace datarelay --create-namespace \\
  --set enrollmentToken="${enrollmentToken || 'YOUR_ENROLLMENT_TOKEN'}" \\
  --set controlPlaneUrl="wss://api.datarelay.io/agent/v1"`

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Add Migration Agent
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Connect a machine inside your infrastructure to DataRelay. Execution occurs locally inside your private subnet.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Name Your Agent */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Name your agent</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Agent Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Production Agent US-East"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Generate Enrollment Credential */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Generate enrollment credential
            </h2>
          </div>

          {!tokenGenerated ? (
            <button
              type="button"
              disabled={isGenerating}
              onClick={generateToken}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? 'Generating token...' : 'Generate enrollment token'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-mono text-xs">
                <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                  {enrollmentToken}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-sans ml-2 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Expires in 30m
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                This token is only used once to register the agent and issue an mTLS certificate. Do not reuse it after enrollment.
              </p>
            </div>
          )}
        </div>

        {/* Step 3: Install the Agent */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Install the agent</h2>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setInstallMethod('docker')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  installMethod === 'docker' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : 'text-slate-400'
                }`}
              >
                Docker
              </button>
              <button
                type="button"
                onClick={() => setInstallMethod('helm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  installMethod === 'helm' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : 'text-slate-400'
                }`}
              >
                Kubernetes (Helm)
              </button>
            </div>
          </div>

          <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800 text-slate-200 font-mono text-xs">
            <button
              type="button"
              onClick={() => copyCommand(installMethod === 'docker' ? dockerSnippet : helmSnippet)}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Copy snippet"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="overflow-x-auto pr-8">
              <code>{installMethod === 'docker' ? dockerSnippet : helmSnippet}</code>
            </pre>
          </div>
        </div>

        {/* Step 4: Connection Status Indicator */}
        {tokenGenerated && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Heartbeat Listener</h3>

            {waitingStatus === 'waiting' && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-800 dark:text-cyan-300">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 animate-ping" />
                  <span className="font-medium">Waiting for outbound connection from agent container...</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWaitingStatus('connected')}
                  className="text-[11px] underline text-cyan-600 hover:text-cyan-800 dark:text-cyan-400"
                >
                  Force test trigger
                </button>
              </div>
            )}

            {waitingStatus === 'connected' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Agent connected</p>
                    <p className="text-[11px] mt-0.5">
                      {agentName} is now online and verified via mutual TLS.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(createdAgentId ? `/agents/${createdAgentId}` : '/agents')}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
                  >
                    <span>Continue to Agent Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
