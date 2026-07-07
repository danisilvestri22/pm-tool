'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createTask, updateTask, softDeleteTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  parentTask: Task
  subtasks: Task[]
}

function SubtaskItem({ sub, onDelete }: { sub: Task; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(sub.name)

  async function toggleComplete() {
    const fd = new FormData()
    fd.set('status', sub.status === 'done' ? 'not_started' : 'done')
    await updateTask(sub.id, fd)
  }

  async function saveName() {
    if (!nameVal.trim()) { onDelete(); return }
    if (nameVal !== sub.name) {
      const fd = new FormData()
      fd.set('name', nameVal.trim())
      await updateTask(sub.id, fd)
    }
    setEditing(false)
  }

  return (
    <div className="group flex items-center gap-2">
      <button
        onClick={toggleComplete}
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
          sub.status === 'done'
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-gray-300 hover:border-emerald-400'
        }`}
        aria-label={sub.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
      >
        {sub.status === 'done' && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') { setNameVal(sub.name); setEditing(false) }
          }}
          className="flex-1 text-sm border-b border-emerald-400 outline-none py-0.5 bg-transparent"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-pointer ${
            sub.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 hover:text-emerald-600'
          }`}
        >
          {nameVal}
        </span>
      )}

      <button
        onClick={() => { if (window.confirm('Delete this subtask?')) onDelete() }}
        className="text-transparent group-hover:text-gray-300 hover:!text-red-400 transition-colors shrink-0"
        title="Delete subtask"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export default function SubtaskList({ parentTask, subtasks }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
        <SubtaskItem
          key={sub.id}
          sub={sub}
          onDelete={() => softDeleteTask(sub.id)}
        />
      ))}

      {adding ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Enter') { e.preventDefault(); await addSubtask() }
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            onBlur={() => { if (!newName.trim()) { setAdding(false); setNewName('') } }}
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
