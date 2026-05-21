'use client'
import { format } from 'date-fns'
import StatusBadge from './StatusBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  onSelect: (task: Task) => void
}

export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, onSelect }: Props) {
  const isOverdue =
    task.due_date &&
    task.status !== 'completed' &&
    new Date(task.due_date) < new Date()

  return (
    <button
      onClick={() => onSelect(task)}
      className={`w-full text-left border-l-2 hover:bg-gray-50 transition-colors ${
        task.status === 'at_risk' ? 'border-red-400 bg-red-50/30' : 'border-transparent'
      }`}
    >
      {/* Mobile layout */}
      <div className="flex items-center gap-3 px-4 py-3 sm:hidden">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">
            {task.name}
            {subtaskCount > 0 && (
              <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtaskCount})</span>
            )}
          </p>
          {(task.responsible || showCompany) && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {showCompany && companyName ? `${companyName} · ` : ''}
              {task.responsible ?? ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} />
          {task.due_date && (
            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div
        className="hidden sm:grid items-center gap-3 px-4 py-3 text-sm"
        style={{
          gridTemplateColumns: showCompany
            ? '2fr 1fr 1fr 90px 80px 90px'
            : '2fr 1fr 90px 80px 90px',
        }}
      >
        <span className="font-medium text-gray-900 truncate">
          {task.name}
          {subtaskCount > 0 && (
            <span className="ml-1.5 text-xs text-gray-400 font-normal">
              ({subtaskCount})
            </span>
          )}
        </span>
        {showCompany && (
          <span className="text-gray-500 truncate">{companyName ?? '—'}</span>
        )}
        <span className="text-gray-600 truncate">{task.responsible ?? '—'}</span>
        <StatusBadge status={task.status} />
        <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
        </span>
        <span className="text-gray-500 truncate">{task.waiting_on ?? '—'}</span>
      </div>
    </button>
  )
}
