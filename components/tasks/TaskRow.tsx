'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

const KNOWN_NAMES = ['Dani', 'Mike', 'Rick Sr', 'Rick Jr', 'Renato', 'Vitor']

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  onSelect: (task: Task) => void
}

export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, onSelect }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(task.name)
  const [vals, setVals] = useState({
    responsible: task.responsible ?? '',
    status: task.status,
    due_date: task.due_date ?? '',
    followup_date: task.followup_date ?? '',
    waiting_on: task.waiting_on ?? '',
  })

  useEffect(() => {
    setNameVal(task.name)
    setVals({
      responsible: task.responsible ?? '',
      status: task.status,
      due_date: task.due_date ?? '',
      followup_date: task.followup_date ?? '',
      waiting_on: task.waiting_on ?? '',
    })
  }, [task])

  async function save(field: string, value: string) {
    const fd = new FormData()
    fd.set(field, value)
    await updateTask(task.id, fd)
  }

  const isOverdue = vals.due_date && vals.status !== 'completed' && new Date(vals.due_date) < new Date()

  const selectClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer max-w-full'
  const dateClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer w-[120px]'

  const statusColor =
    vals.status === 'completed' ? 'text-green-700' :
    vals.status === 'at_risk' ? 'text-red-600' :
    'text-blue-700'

  return (
    <div className={`w-full border-l-2 transition-colors ${
      vals.status === 'at_risk' ? 'border-red-400 bg-red-50/30' : 'border-transparent hover:bg-gray-50/50'
    }`}>
      {/* Mobile layout — tap row to open panel */}
      <div className="flex items-center gap-3 px-4 py-3 sm:hidden" onClick={() => onSelect(task)}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">
            {task.name}
            {subtaskCount > 0 && <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtaskCount})</span>}
          </p>
          {(task.responsible || showCompany) && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {showCompany && companyName ? `${companyName} · ` : ''}
              {task.responsible ?? ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            vals.status === 'completed' ? 'bg-green-100 text-green-700' :
            vals.status === 'at_risk' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {vals.status === 'on_track' ? 'On track' : vals.status === 'at_risk' ? 'At risk' : 'Done'}
          </span>
          {vals.due_date && (
            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {format(new Date(vals.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div
        className="hidden sm:grid items-center gap-3 px-4 py-2 text-sm"
        style={{
          gridTemplateColumns: showCompany
            ? '2fr 1fr 1fr 110px 120px 120px 120px'
            : '2fr 1fr 110px 120px 120px 120px',
        }}
      >
        {/* Task name — click to edit, double-click or icon to open panel */}
        <div className="flex items-center gap-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={async () => {
                setEditingName(false)
                if (nameVal.trim() && nameVal !== task.name) {
                  const fd = new FormData()
                  fd.set('name', nameVal.trim())
                  await updateTask(task.id, fd)
                } else {
                  setNameVal(task.name)
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') { setNameVal(task.name); setEditingName(false) }
              }}
              className="font-medium text-gray-900 text-sm w-full border-b border-emerald-400 focus:outline-none bg-transparent py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              onDoubleClick={() => onSelect(task)}
              className="font-medium text-gray-900 truncate text-left hover:text-emerald-600 transition-colors py-1 text-sm"
              title="Click to edit · Double-click to open"
            >
              {nameVal}
              {subtaskCount > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtaskCount})</span>
              )}
            </button>
          )}
        </div>

        {showCompany && (
          <span className="text-gray-500 truncate text-xs">{companyName ?? '—'}</span>
        )}

        {/* Responsible */}
        <select
          value={vals.responsible}
          onChange={e => {
            setVals(v => ({ ...v, responsible: e.target.value }))
            save('responsible', e.target.value)
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {KNOWN_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Status */}
        <select
          value={vals.status}
          onChange={e => {
            const v = e.target.value as Task['status']
            setVals(s => ({ ...s, status: v }))
            save('status', v)
          }}
          className={`${selectClass} font-medium ${statusColor}`}
        >
          <option value="on_track">On track</option>
          <option value="at_risk">At risk</option>
          <option value="completed">Completed</option>
        </select>

        {/* Due date */}
        <input
          type="date"
          value={vals.due_date}
          onChange={e => {
            setVals(v => ({ ...v, due_date: e.target.value }))
            save('due_date', e.target.value)
          }}
          className={`${dateClass} ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}
        />

        {/* Reminder date */}
        <input
          type="date"
          value={vals.followup_date}
          onChange={e => {
            setVals(v => ({ ...v, followup_date: e.target.value }))
            save('followup_date', e.target.value)
          }}
          className={`${dateClass} text-emerald-500`}
        />

        {/* Waiting on */}
        <select
          value={vals.waiting_on}
          onChange={e => {
            setVals(v => ({ ...v, waiting_on: e.target.value }))
            save('waiting_on', e.target.value)
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {KNOWN_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  )
}
