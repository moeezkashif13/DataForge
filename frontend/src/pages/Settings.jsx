import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Key,
  Trash2,
  CheckCircle2,
  Copy,
  AlertTriangle,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function Settings() {
  const { currentWorkspace } = useData()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('general')
  const [orgName, setOrgName] = useState(currentWorkspace.name)
  const [timezone, setTimezone] = useState('UTC (Etc/UTC)')
  const [defaultEnv, setDefaultEnv] = useState('Production')

  // Notification toggles
  const [notifySuccess, setNotifySuccess] = useState(true)
  const [notifyFailure, setNotifyFailure] = useState(true)
  const [notifyAgentOffline, setNotifyAgentOffline] = useState(true)
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/X00')

  // API Token state
  const [apiKey, setApiKey] = useState('drl_live_9f81a742c38d40bebc8e71')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('')

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'security', name: 'Security & mTLS', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'api', name: 'API Credentials', icon: Key },
    { id: 'danger', name: 'Danger Zone', icon: Trash2 },
  ]

  const handleSaveGeneral = (e) => {
    e.preventDefault()
    showToast('Saved', 'Organization settings updated.', 'success')
  }

  const handleRotateKey = () => {
    const newKey = 'drl_live_' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    setApiKey(newKey)
    showToast('API Key Rotated', 'New secret key generated. Ensure agents and CI/CD are updated.', 'warning')
  }

  const handleDeleteOrg = () => {
    if (confirmDeleteInput !== currentWorkspace.name) {
      showToast('Validation Error', 'Workspace name did not match confirmation string.', 'error')
      return
    }
    showToast('Workspace Deleted', `Workspace "${currentWorkspace.name}" removed.`, 'error')
    setIsDeleteModalOpen(false)
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage workspace preferences, security configurations, and API keys.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {/* GENERAL */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">General Preferences</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization / Workspace Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full max-w-md px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full max-w-md px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="UTC (Etc/UTC)">UTC (Etc/UTC)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
                  <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                  <option value="Asia/Karachi (PKT)">Asia/Karachi (PKT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Environment
                </label>
                <select
                  value={defaultEnv}
                  onChange={(e) => setDefaultEnv(e.target.value)}
                  className="w-full max-w-md px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95"
              >
                Save Preferences
              </button>
            </div>
          </form>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Security &amp; Zero-Trust Policies</h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                  <p className="text-slate-500 mt-0.5">Enforce hardware security key or TOTP for all team members.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  ENFORCED
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Agent Mutual TLS (mTLS)</p>
                  <p className="text-slate-500 mt-0.5">X.509 client certificate verification on all WebSocket frames.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  ACTIVE
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Session Timeout</p>
                  <p className="text-slate-500 mt-0.5">Auto sign-out after 12 hours of inactivity.</p>
                </div>
                <span className="font-mono text-slate-700 dark:text-slate-300">12 Hours</span>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Alert Routing &amp; Webhooks</h2>

            <div className="space-y-4 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Migration Completed</p>
                  <p className="text-slate-500">Dispatch notification when a migration finishes 100%.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifySuccess}
                  onChange={(e) => setNotifySuccess(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Migration Error / Halt</p>
                  <p className="text-slate-500">Immediate high-priority alert if batch validation fails.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyFailure}
                  onChange={(e) => setNotifyFailure(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Agent Offline Disconnect</p>
                  <p className="text-slate-500">Alert if an agent misses 3 consecutive heartbeats.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyAgentOffline}
                  onChange={(e) => setNotifyAgentOffline(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 w-4 h-4"
                />
              </label>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slack Webhook Endpoint
                </label>
                <input
                  type="url"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => showToast('Saved', 'Alert preferences saved.', 'success')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                Save Notification Rules
              </button>
            </div>
          </div>
        )}

        {/* API CREDENTIALS */}
        {activeTab === 'api' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Control Plane API Keys</h2>
              <p className="text-xs text-slate-500 mt-0.5">Used for CI/CD automation and programmatic job definitions.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 space-y-3 font-mono text-xs">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Live API Secret Key</span>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{apiKey}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(apiKey)
                    showToast('Copied', 'API Key copied to clipboard', 'info')
                  }}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Copy API key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRotateKey}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Rotate API Key
              </button>
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        {activeTab === 'danger' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
            <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">Danger Zone</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Deleting this organization will irrevocably unregister all connected customer agents, delete all migration definitions, and purge telemetry checkpoints.
            </p>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              Delete Organization
            </button>
          </div>
        )}
      </div>

      {/* Delete Org Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Organization</h3>
            <p className="text-xs text-slate-500">
              Type <strong className="text-slate-900 dark:text-white font-mono">{currentWorkspace.name}</strong> to confirm deletion.
            </p>

            <input
              type="text"
              placeholder={currentWorkspace.name}
              value={confirmDeleteInput}
              onChange={(e) => setConfirmDeleteInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmDeleteInput !== currentWorkspace.name}
                onClick={handleDeleteOrg}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
