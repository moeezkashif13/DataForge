import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

export function Breadcrumbs({ items = [] }) {
  if (!items.length) return null

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono mb-4" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />}
            {isLast || !item.to ? (
              <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[150px]">
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
