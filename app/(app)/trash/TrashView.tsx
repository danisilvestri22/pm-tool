'use client'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { restoreTask } from '@/app/(app)/actions/tasks'
import { permanentlyDeleteTask, emptyTrash } from '@/app/(app)/actions/trash'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  companies: Record<string, string>
}

export default function TrashView({ tasks, companies }: Props) {
  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Trash</h1>
          <p className="text-xs text-gray-400 mt-0.5">Items are permanently deleted after 30 days.</p>
        </div>
        {tasks.length > 0 && (
          <button
            onClick={() => emptyTrash()}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Empty trash
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <Trash2 size={32} className="mb-2 opacity-30" />
          <p className="text-sm">Trash is empty.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="divide-y divide-gray-50">
            {tasks.map(task => {
              const deletedDaysAgo = task.deleted_at
                ? Math.floor((Date.now() - new Date(task.deleted_at).getTime()) / 86400000)
                : 0
              const daysLeft = 30 - deletedDaysAgo

              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{task.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {companies[task.company_id] ?? 'Unknown company'}
                      {task.deleted_at
                        ? ` · Deleted ${format(new Date(task.deleted_at), 'MMM d, yyyy')}`
                        : ''}
                      {' · '}
                      <span className={daysLeft <= 3 ? 'text-red-500' : ''}>
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} until permanent deletion
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => restoreTask(task.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => permanentlyDeleteTask(task.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete forever
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
