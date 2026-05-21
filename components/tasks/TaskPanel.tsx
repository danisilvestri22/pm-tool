'use client'
import { useState } from 'react'
import { X, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import TaskPanelField from './TaskPanelField'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task | null
  subtasks?: Task[]
  onClose: () => void
  onEdit?: (task: Task) => void
}

export default function TaskPanel({ task, subtasks = [], onClose, onEdit }: Props) {
  if (!task) return null

  return (
    <aside className="w-80 bg-white border-l h-full overflow-y-auto shrink-0 flex flex-col">
      <div className="flex items-start justify-between p-4 border-b gap-2">
        <h2 className="font-semibold text-gray-900 flex-1 min-w-0 break-words">{task.name}</h2>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="Edit task"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <dl className="p-4 space-y-4 flex-1">
        <TaskPanelField label="Status">
          <StatusBadge status={task.status} />
        </TaskPanelField>

        <TaskPanelField label="Priority">
          <PriorityBadge priority={task.priority} />
        </TaskPanelField>

        <TaskPanelField label="Responsible">
          {task.responsible ?? '—'}
        </TaskPanelField>

        <TaskPanelField label="Due date">
          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
        </TaskPanelField>

        <TaskPanelField label="Follow-up date">
          {task.followup_date ? (
            <span className="text-indigo-600">
              {format(new Date(task.followup_date), 'MMM d, yyyy')} — remind me
            </span>
          ) : (
            '—'
          )}
        </TaskPanelField>

        <TaskPanelField label="Waiting on">
          {task.waiting_on ?? '—'}
        </TaskPanelField>

        {task.notes && (
          <TaskPanelField label="Notes">
            <p className="whitespace-pre-wrap text-gray-700">{task.notes}</p>
          </TaskPanelField>
        )}

        {subtasks.length > 0 && (
          <TaskPanelField label={`Subtasks (${subtasks.length})`}>
            <div className="space-y-1 mt-1">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      sub.status === 'completed' ? 'bg-gray-300' : 'bg-indigo-400'
                    }`}
                  />
                  <span
                    className={
                      sub.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'
                    }
                  >
                    {sub.name}
                  </span>
                </div>
              ))}
            </div>
          </TaskPanelField>
        )}
      </dl>
    </aside>
  )
}
