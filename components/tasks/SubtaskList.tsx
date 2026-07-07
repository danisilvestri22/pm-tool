'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createTask, updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  parentTask: Task
  subtasks: Task[]
}

export default function SubtaskList({ parentTask, subtasks }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function toggleComplete(subtask: Task) {
    const fd = new FormData()
    fd.set('status', subtask.status === 'done' ? 'in_progress' : 'done')
    await updateTask(subtask.id, fd)
  }

  async function addSubtask() {
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    const fd = new FormData()
    fd.set('name', newName.trim())
    fd.set('company_id', parentTask.company_id)
    fd.set('parent_task_id', parentTask.id)
    await createTask(fd)
    setNewName('')
    setSubmitting(false)
    setAdding(false)
  }

  return (
    <div className="space-y-2 mt-1">
      {subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-2">
          <button
            onClick={() => toggleComplete(sub)}
            className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
              sub.status === 'done'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-300 hover:border-emerald-400'
            }`}
            aria-label={sub.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
          >
            {sub.status === 'done' && (
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10">
                <path
                  d="M1.5 5l2.5 2.5 4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <span
            className={`text-sm ${
              sub.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'
            }`}
          >
            {sub.name}
          </span>
        </div>
      ))}

      {adding ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                await addSubtask()
              }
              if (e.key === 'Escape') {
                setAdding(false)
                setNewName('')
              }
            }}
            onBlur={() => {
              if (!newName.trim()) {
                setAdding(false)
                setNewName('')
              }
            }}
            placeholder="Subtask name"
            className="flex-1 text-sm border-b border-emerald-400 outline-none py-0.5 bg-transparent"
            autoFocus
            disabled={submitting}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
        >
          <Plus size={12} />
          Add subtask
        </button>
      )}
    </div>
  )
}
