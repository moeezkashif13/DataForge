import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((title, description, type = 'info', duration = 4500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6)
    const newToast = { id, title, description, type }
    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-500 shrink-0" />,
  }

  const borderStyles = {
    success: 'border-emerald-500/20 dark:border-emerald-500/30',
    warning: 'border-amber-500/20 dark:border-amber-500/30',
    error: 'border-rose-500/20 dark:border-rose-500/30',
    info: 'border-cyan-500/20 dark:border-cyan-500/30',
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border ${
              borderStyles[toast.type] || borderStyles.info
            } shadow-xl shadow-slate-950/10 dark:shadow-black/40 text-slate-900 dark:text-slate-100 transition-all animate-in slide-in-from-bottom-2 duration-200`}
          >
            {icons[toast.type] || icons.info}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold tracking-tight">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
