import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router'
import {
  LayoutDashboard,
  Folder,
  ArrowRightLeft,
  Server,
  Database,
  Activity,
  FileText,
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  Check,
  Plus,
  ShieldCheck,
  Sun,
  Moon,
  Search,
  Menu,
  X,
  LogOut,
  Sliders,
  ExternalLink,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../store/slices/authSlice'
import { useLogoutMutation } from '../store/api/authApi'

export default function AppShell() {
  const { theme, toggleTheme, workspaces, currentWorkspace, switchWorkspace, createWorkspace, agents } = useData()
  const currentUser = useSelector(selectCurrentUser)
  const [logout] = useLogoutMutation()

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsEnv, setNewWsEnv] = useState('Production')
  const location = useLocation()
  const navigate = useNavigate()

  const displayName =
    currentUser?.name ||
    (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null) ||
    'Abdul Moeez'
  const displayEmail = currentUser?.email || 'admin@company.com'
  const avatarInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || 'AM'

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    try {
      await logout().unwrap()
    } catch {
      // authSlice will clean up state regardless
    }
    navigate('/login')
  }

  const wsRef = useRef(null)
  const userMenuRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wsRef.current && !wsRef.current.contains(event.target)) {
        setWsDropdownOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const onlineAgents = agents.filter((a) => a.status === 'ONLINE').length
  const totalAgents = agents.length

  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
    }`

  const handleCreateWorkspace = (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    createWorkspace(newWsName.trim(), newWsEnv)
    setNewWsName('')
    setCreateWsModalOpen(false)
    setWsDropdownOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand & Logo */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              DataRelay
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                SaaS
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
              Control Plane
            </span>
          </div>
        </Link>
      </div>

      {/* Workspace Selector */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 relative" ref={wsRef}>
        <button
          type="button"
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 transition-all text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Workspace
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {currentWorkspace.name}
            </p>
            <span className="inline-flex items-center text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
              {currentWorkspace.environment}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        </button>

        {/* Workspace Dropdown */}
        {wsDropdownOpen && (
          <div className="absolute top-full left-3 right-3 mt-1.5 z-50 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs">
            <p className="px-2.5 py-1.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
              Switch workspace
            </p>
            <div className="space-y-0.5">
              {workspaces.map((ws) => {
                const isSelected = ws.id === currentWorkspace.id
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      switchWorkspace(ws.id)
                      setWsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium">{ws.name}</p>
                      <p className="text-[10px] text-slate-400">{ws.environment}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                )
              })}
            </div>
            <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCreateWsModalOpen(true)
                  setWsDropdownOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* MAIN */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Main
          </p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/projects" className={navItemClass}>
              <Folder className="w-4 h-4 shrink-0" />
              <span>Projects</span>
            </NavLink>
            <NavLink to="/migrations" className={navItemClass}>
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <span>Migrations</span>
            </NavLink>
            <NavLink to="/agents" className={navItemClass}>
              <Server className="w-4 h-4 shrink-0" />
              <div className="flex items-center justify-between flex-1">
                <span>Agents</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {onlineAgents}/{totalAgents}
                </span>
              </div>
            </NavLink>
            <NavLink to="/connections" className={navItemClass}>
              <Database className="w-4 h-4 shrink-0" />
              <span>Connections</span>
            </NavLink>
          </nav>
        </div>

        {/* MONITORING */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Monitoring
          </p>
          <nav className="space-y-1">
            <NavLink to="/activity" className={navItemClass}>
              <Activity className="w-4 h-4 shrink-0" />
              <span>Activity</span>
            </NavLink>
            <NavLink to="/logs" className={navItemClass}>
              <FileText className="w-4 h-4 shrink-0" />
              <span>Logs</span>
            </NavLink>
          </nav>
        </div>

        {/* MANAGEMENT */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Management
          </p>
          <nav className="space-y-1">
            <NavLink to="/team" className={navItemClass}>
              <Users className="w-4 h-4 shrink-0" />
              <span>Team</span>
            </NavLink>
            <NavLink to="/billing" className={navItemClass}>
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Billing</span>
            </NavLink>
            <NavLink to="/settings" className={navItemClass}>
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Agent Health summary card */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs">
        <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Agent Network
          </span>
          <span className="font-mono text-[11px] text-slate-500">{onlineAgents}/{totalAgents} Online</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Customer Data Plane secure inside your infrastructure.
        </p>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 relative" ref={userMenuRef}>
        <button
          type="button"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs uppercase">
              {avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{displayEmail}</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* User Popover Menu */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1.5 z-50 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1">
            <Link
              to="/settings"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              Preferences
            </Link>
            <button
              type="button"
              onClick={() => {
                toggleTheme()
                setUserMenuOpen(false)
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                Theme: {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full shadow-2xl z-10">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Architecture guarantee banner */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono text-[11px]">Zero-Trust Data Plane · Data remains in customer VPC</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick search input */}
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search migrations, agents..."
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-700 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                ⌘K
              </kbd>
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Create Migration CTA */}
            <Link
              to="/migrations/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Migration</span>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Modal for creating a workspace */}
      {createWsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Workspaces isolate configurations, agents, and migration pipelines.
            </p>
            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme FinTech Core"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Environment
                </label>
                <select
                  value={newWsEnv}
                  onChange={(e) => setNewWsEnv(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateWsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
