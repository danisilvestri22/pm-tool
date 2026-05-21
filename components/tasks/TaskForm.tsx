'use client'
import { useState } from 'react'
import type { Task } from '@/types/database'

interface Props {
  companyId: string
  task?: Task
  parentTaskId?: string
  knownNames?: string[]
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean } | undefined>
  onCancel: () => void
}

export default function TaskForm({ companyId, task, parentTaskId, knownNames = [], onSubmit, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('company_id', companyId)
    if (parentTaskId) fd.set('parent_task_id', parentTaskId)
    const result = await onSubmit(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <datalist id="form-known-names">
        {knownNames.map(n => <option key={n} value={n} />)}
      </datalist>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Task name *</label>
        <input name="name" required defaultValue={task?.name} className={inputClass} autoFocus />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Responsible</label>
        <input name="responsible" list="form-known-names" defaultValue={task?.responsible ?? ''} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select name="status" defaultValue={task?.status ?? 'on_track'} className={inputClass}>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select name="priority" defaultValue={task?.priority ?? 'medium'} className={inputClass}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Due date</label>
          <input type="date" name="due_date" defaultValue={task?.due_date ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Follow-up date</label>
          <input type="date" name="followup_date" defaultValue={task?.followup_date ?? ''} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Waiting on</label>
        <input name="waiting_on" list="form-known-names" defaultValue={task?.waiting_on ?? ''} className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={task?.notes ?? ''}
          rows={3}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : task ? 'Save changes' : 'Add task'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 px-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
