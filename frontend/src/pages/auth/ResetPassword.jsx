import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      showToast('Validation Error', 'Passwords do not match.', 'error')
      return
    }
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      showToast('Password Updated', 'Your credentials have been securely refreshed.', 'success')
      navigate('/login')
    }, 600)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reset your password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Choose a secure new password for your DataRelay account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            New password
          </label>
          <input
            type="password"
            required
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            required
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          {isLoading ? 'Updating...' : 'Set new password'}
        </button>
      </form>

      <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
        <Link to="/login" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
          Cancel and return to sign in
        </Link>
      </div>
    </div>
  )
}
