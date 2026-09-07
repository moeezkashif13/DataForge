import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    showToast('Reset Link Dispatched', `Check ${email} for instructions`, 'info')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Forgot your password?
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Reset instructions sent
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            If an account exists for <span className="font-mono text-slate-700 dark:text-slate-200">{email}</span>, you will receive password reset instructions.
          </p>
          <Link
            to="/reset-password"
            className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
          >
            Simulate opening reset link →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            Send reset link
          </button>
        </form>
      )}

      <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  )
}
