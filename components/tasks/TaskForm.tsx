'use client'
import { useState } from 'react'
import type { Task } from '@/types/database'
import { addPerson } from '@/app/(app)/actions/people'

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
  const [people, setPeople] = useState<string[]>(knownNames)
  const [responsible, setResponsible] = useState(task?.responsible ?? '')
  const [addingPerson, setAddingPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [addPersonError, setAddPersonError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('company_id', companyId)
    fd.set('responsible', responsible)
    if (parentTaskId) fd.set('parent_task_id', parentTaskId)
    const result = await onSubmit(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleAddPerson() {
    if (!newPersonName.trim()) return
    setAddPersonError(null)
    const result = await addPerson(newPersonName)
    if (result.error) {
      setAddPersonError(result.error)
      return
    }
    const name = newPersonName.trim()
    setPeople(prev => [...prev, name].sort((a, b) => a.localeCompare(b)))
    setResponsible(name)
    setNewPersonName('')
    setAddingPerson(false)
  }

  function handleResponsibleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__add_new__') {
      setAddingPerson(true)
      setNewPersonName('')
      setAddPersonError(null)
    } else {
      setResponsible(e.target.value)
    }
  }

  const inputClass =
    'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <datalist id="form-known-names">
        {people.map(n => <option key={n} value={n} />)}
      </datalist>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Task name *</label>
        <input name="name" required defaultValue={task?.name} className={inputClass} autoFocus />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Responsible</label>
        {addingPerson ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input
                autoFocus
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddPerson() }
                  if (e.key === 'Escape') setAddingPerson(false)
                }}
                placeholder="Enter name…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleAddPerson}
                className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingPerson(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
            {addPersonError && <p className="text-xs text-red-600">{addPersonError}</p>}
          </div>
        ) : (
          <select
            value={responsible}
            onChange={handleResponsibleChange}
            className={inputClass}
          >
            <option value="">—</option>
            {people.map(n => <option key={n} value={n}>{n}</option>)}
            <option value="__add_new__">＋ Add new person…</option>
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select name="status" defaultValue={task?.status ?? 'not_started'} className={inputClass}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_response">Waiting on Response</option>
            <option value="blocked">Blocked</option>
            <option value="at_risk">Overdue / At Risk</option>
            <option value="done">Done</option>
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
          className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
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
