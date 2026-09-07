import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { ToastProvider } from './context/ToastContext'
import { DataProvider } from './context/DataContext'

// Layouts
import AppShell from './layouts/AppShell'
import AuthLayout from './layouts/AuthLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// App Pages
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Migrations from './pages/Migrations'
import CreateMigration from './pages/CreateMigration'
import MigrationDetail from './pages/MigrationDetail'
import Agents from './pages/Agents'
import AddAgent from './pages/AddAgent'
import AgentDetail from './pages/AgentDetail'
import Connections from './pages/Connections'
import Activity from './pages/Activity'
import Logs from './pages/Logs'
import Team from './pages/Team'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route index element={<Navigate to="/auth/login" replace />} />
            </Route>

            {/* Direct top-level auth routes for user convenience */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Authenticated Application Control Plane */}
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Projects */}
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />

              {/* Migrations */}
              <Route path="migrations" element={<Migrations />} />
              <Route path="migrations/new" element={<CreateMigration />} />
              <Route path="migrations/:migrationId" element={<MigrationDetail />} />

              {/* Agents */}
              <Route path="agents" element={<Agents />} />
              <Route path="agents/new" element={<AddAgent />} />
              <Route path="agents/:agentId" element={<AgentDetail />} />

              {/* Connections */}
              <Route path="connections" element={<Connections />} />
              <Route path="connections/new" element={<Connections />} />

              {/* Monitoring */}
              <Route path="activity" element={<Activity />} />
              <Route path="logs" element={<Logs />} />

              {/* Management */}
              <Route path="team" element={<Team />} />
              <Route path="billing" element={<Billing />} />

              {/* Settings */}
              <Route path="settings" element={<Settings />} />
              <Route path="settings/:tab" element={<Settings />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </ToastProvider>
  )
}
