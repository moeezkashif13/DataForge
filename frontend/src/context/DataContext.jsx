import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  initialWorkspaces,
  initialProjects,
  initialAgents,
  initialConnections,
  initialMigrations,
  initialActivities,
  initialLogs,
  initialTeam,
  initialInvoices,
} from '../types/mockData'
import { useToast } from './ToastContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { showToast } = useToast()

  // Theme state
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('datarelay_theme')
      if (saved) return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('datarelay_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Workspaces
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [currentWorkspace, setCurrentWorkspace] = useState(initialWorkspaces[0])

  const switchWorkspace = (wsId) => {
    const found = workspaces.find((w) => w.id === wsId)
    if (found) {
      setCurrentWorkspace(found)
      showToast('Workspace Switched', `Active workspace: ${found.name} (${found.environment})`, 'info')
    }
  }

  const createWorkspace = (name, environment) => {
    const newWs = {
      id: `ws-${Date.now()}`,
      name,
      environment: environment || 'Production',
      active: false,
    }
    setWorkspaces((prev) => [...prev, newWs])
    setCurrentWorkspace(newWs)
    showToast('Workspace Created', `Successfully switched to ${name}`, 'success')
  }

  // Projects
  const [projects, setProjects] = useState(initialProjects)

  const addProject = (projectData) => {
    const newProj = {
      id: `proj-${Date.now()}`,
      slug: projectData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      migrationCount: 0,
      agentCount: 1,
      lastActivity: 'Just now',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      ...projectData,
    }
    setProjects((prev) => [newProj, ...prev])
    addActivity({
      type: 'PROJECT_CREATED',
      title: 'Project created',
      detail: `Project "${newProj.name}" initialized in ${newProj.environment}`,
      user: 'Abdul Moeez',
      icon: 'folder',
      severity: 'info',
    })
    showToast('Project Created', `Project "${newProj.name}" is now ready.`, 'success')
    return newProj
  }

  // Agents
  const [agents, setAgents] = useState(initialAgents)

  const registerAgent = (agentData) => {
    const newAgent = {
      id: `agent-${Date.now()}`,
      status: 'ONLINE',
      version: 'v1.4.2',
      ip: '10.240.19.102',
      lastHeartbeat: 'Just now',
      lastHeartbeatMs: 1000,
      activeMigrations: 0,
      totalCompleted: 0,
      uptime: '100% (< 1 hour)',
      cpuUsage: '3%',
      memUsage: '340 MB / 8 GB',
      networkEgress: '0.0 MB/s',
      dockerImage: 'datarelay/migration-agent:v1.4.2',
      registeredAt: new Date().toISOString(),
      ...agentData,
    }
    setAgents((prev) => [newAgent, ...prev])
    addActivity({
      type: 'AGENT_ENROLLED',
      title: 'Agent registered',
      detail: `Agent "${newAgent.name}" successfully enrolled via secure token`,
      user: 'Abdul Moeez',
      icon: 'server',
      severity: 'success',
    })
    showToast('Agent Online', `Agent "${newAgent.name}" connected via WebSocket.`, 'success')
    return newAgent
  }

  // Connections
  const [connections, setConnections] = useState(initialConnections)

  const addConnection = (connData) => {
    const newConn = {
      id: `conn-${Date.now()}`,
      status: 'HEALTHY',
      lastTested: 'Just now',
      latencyMs: 1.5,
      managedBy: 'Customer Vault / Secret Manager',
      ...connData,
    }
    setConnections((prev) => [newConn, ...prev])
    addActivity({
      type: 'CONNECTION_ADDED',
      title: 'Connection profile created',
      detail: `Configured ${newConn.type} endpoint "${newConn.name}"`,
      user: 'Abdul Moeez',
      icon: 'database',
      severity: 'info',
    })
    showToast('Connection Profile Added', `Endpoint ${newConn.name} verified.`, 'success')
    return newConn
  }

  const testConnection = async (connId) => {
    // Simulated connection test
    return new Promise((resolve) => {
      setTimeout(() => {
        setConnections((prev) =>
          prev.map((c) => (c.id === connId ? { ...c, lastTested: 'Just now', status: 'HEALTHY' } : c))
        )
        showToast('Connection Verified', 'Control plane probe responded in 1.9ms with TLS 1.3.', 'success')
        resolve({ success: true, latencyMs: 1.9 })
      }, 700)
    })
  }

  // Migrations
  const [migrations, setMigrations] = useState(initialMigrations)

  const addMigration = (migrationData) => {
    const newMig = {
      id: `mig-${Date.now()}`,
      status: 'READY',
      progress: 0,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      throughput: 0,
      startedAt: 'Ready to start',
      elapsed: '--',
      eta: 'Pending run',
      checkpoint: 'initial_state',
      retries: 0,
      batchSize: 2000,
      lastRun: 'Never',
      ...migrationData,
    }
    setMigrations((prev) => [newMig, ...prev])
    addActivity({
      type: 'MIGRATION_CREATED',
      title: 'Migration configured',
      detail: `Created definition "${newMig.name}" for ${newMig.projectName}`,
      user: 'Abdul Moeez',
      icon: 'workflow',
      severity: 'info',
    })
    showToast('Migration Created', `"${newMig.name}" is configured and ready for execution.`, 'success')
    return newMig
  }

  const startMigration = (migId) => {
    setMigrations((prev) =>
      prev.map((m) =>
        m.id === migId
          ? {
              ...m,
              status: 'RUNNING',
              startedAt: 'Just now',
              throughput: 720,
              eta: '~14 minutes',
            }
          : m
      )
    )
    addActivity({
      type: 'MIGRATION_STARTED',
      title: 'Migration execution triggered',
      detail: `Control plane dispatched run command to assigned agent`,
      user: 'Abdul Moeez',
      icon: 'play',
      severity: 'active',
    })
    showToast('Migration Started', 'Execution dispatched to customer-hosted agent.', 'success')
  }

  const pauseMigration = (migId) => {
    setMigrations((prev) =>
      prev.map((m) =>
        m.id === migId
          ? {
              ...m,
              status: 'PAUSED',
              throughput: 0,
              eta: 'Paused',
            }
          : m
      )
    )
    addActivity({
      type: 'MIGRATION_PAUSED',
      title: 'Migration paused',
      detail: `Agent saved checkpoint and paused active consumer threads`,
      user: 'Abdul Moeez',
      icon: 'pause',
      severity: 'warning',
    })
    showToast('Migration Paused', 'Agent paused batch execution safely at checkpoint.', 'warning')
  }

  const resumeMigration = (migId) => {
    setMigrations((prev) =>
      prev.map((m) =>
        m.id === migId
          ? {
              ...m,
              status: 'RUNNING',
              throughput: 680,
              eta: '~8 minutes',
            }
          : m
      )
    )
    addActivity({
      type: 'MIGRATION_RESUMED',
      title: 'Migration resumed',
      detail: `Resumed from checkpoint without record duplication`,
      user: 'Abdul Moeez',
      icon: 'play',
      severity: 'active',
    })
    showToast('Migration Resumed', 'Agent resumed data transfer.', 'info')
  }

  const cancelMigration = (migId) => {
    setMigrations((prev) =>
      prev.map((m) =>
        m.id === migId
          ? {
              ...m,
              status: 'CANCELLED',
              throughput: 0,
              eta: 'Cancelled',
            }
          : m
      )
    )
    addActivity({
      type: 'MIGRATION_CANCELLED',
      title: 'Migration cancelled',
      detail: `Operation halted by user. Checkpoint stored for audit.`,
      user: 'Abdul Moeez',
      icon: 'x',
      severity: 'error',
    })
    showToast('Migration Cancelled', 'Active execution halted.', 'error')
  }

  // Activities & Logs
  const [activities, setActivities] = useState(initialActivities)
  const [logs, setLogs] = useState(initialLogs)

  const addActivity = (act) => {
    const newAct = {
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
      ...act,
    }
    setActivities((prev) => [newAct, ...prev])
  }

  const addLog = (logEntry) => {
    const newLog = {
      id: `l-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.000',
      ...logEntry,
    }
    setLogs((prev) => [newLog, ...prev])
  }

  // Team
  const [team, setTeam] = useState(initialTeam)

  const inviteMember = (email, role) => {
    const name = email.split('@')[0].replace('.', ' ')
    const initials = name
      .split(' ')
      .map((s) => s[0]?.toUpperCase() || '')
      .join('')
      .substring(0, 2)
    const newMember = {
      id: `u-${Date.now()}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email,
      role,
      avatar: initials || 'US',
      status: 'Pending Invite',
      joined: 'Today',
    }
    setTeam((prev) => [...prev, newMember])
    showToast('Invitation Sent', `Sent workspace invitation to ${email}`, 'success')
  }

  // Real-time progress simulator (simulates active stream in control plane)
  useEffect(() => {
    const interval = setInterval(() => {
      setMigrations((prev) =>
        prev.map((m) => {
          if (m.status === 'RUNNING' && m.recordsProcessed < m.recordsTotal) {
            const increment = Math.floor(Math.random() * 250) + 150
            const newProcessed = Math.min(m.recordsTotal, m.recordsProcessed + increment)
            const failedIncrement = Math.random() > 0.85 ? Math.floor(Math.random() * 3) : 0
            const newSucceeded = m.recordsSucceeded + (increment - failedIncrement)
            const newFailed = m.recordsFailed + failedIncrement
            const newProgress = Number(((newProcessed / m.recordsTotal) * 100).toFixed(1))

            return {
              ...m,
              recordsProcessed: newProcessed,
              recordsSucceeded: newSucceeded,
              recordsFailed: newFailed,
              progress: newProgress,
              status: newProcessed >= m.recordsTotal ? 'COMPLETED' : 'RUNNING',
            }
          }
          return m
        })
      )
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  return (
    <DataContext.Provider
      value={{
        theme,
        toggleTheme,
        workspaces,
        currentWorkspace,
        switchWorkspace,
        createWorkspace,
        projects,
        addProject,
        agents,
        registerAgent,
        connections,
        addConnection,
        testConnection,
        migrations,
        addMigration,
        startMigration,
        pauseMigration,
        resumeMigration,
        cancelMigration,
        activities,
        addActivity,
        logs,
        addLog,
        team,
        inviteMember,
        invoices: initialInvoices,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
