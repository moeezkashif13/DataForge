import { Navigate, useLocation } from 'react-router'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectIsAuthInitialized } from '../../store/slices/authSlice'

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitialized = useSelector(selectIsAuthInitialized)
  const location = useLocation()

  if (!isInitialized && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
            Verifying secure session...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
