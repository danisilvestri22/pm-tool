'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'
import Toast from '@/components/ui/Toast'

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  people?: string[]
  showReminder?: boolean
  onSelect: (task: Task) => void
}

function NotesModal({ taskName, initialValue, onSave, onCancel }: {
  taskName: string
  initialValue: string
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 text-sm truncate pr-4">{taskName}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <textarea
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
          rows={8}
          placeholder="Add a note…"
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        <div className="flex gap-2 mt-3 justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, people = [], showReminder = false, onSelect }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(task.name)
  const [notesVal, setNotesVal] = useState(task.notes ?? '')
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [vals, setVals] = useState({
    responsible: task.responsible ?? '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? '',
    followup_date: task.followup_date ?? '',
    waiting_on: task.waiting_on ?? '',
  })
  const [toast, setToast] = useState<{ id: number; message: string; undo: () => void } | null>(null)
  const toastIdRef = useRef(0)

  useEffect(() => {
    setNameVal(task.name)
    setNotesVal(task.notes ?? '')
    setVals({
      responsible: task.responsible ?? '',
      status: task.status,
      priority: task.priority,
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

  const dismissToast = useCallback(() => setToast(null), [])

  function showUndo(message: string, undo: () => void) {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, undo })
  }

  const isOverdue = vals.due_date && vals.status !== 'completed' && new Date(vals.due_date) < new Date()

  const selectClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer max-w-full'
  const dateClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer w-[120px]'

  const statusColor =
    vals.status === 'completed' ? 'text-green-700' :
    vals.status === 'at_risk' ? 'text-red-600' :
    'text-blue-700'

  return (
    <>
      <div className={`w-full border-l-2 transition-colors ${
        vals.status === 'at_risk' ? 'border-red-400 bg-red-50/30' : 'border-transparent hover:bg-gray-50/50'
      }`}>
        {/* Mobile layout */}
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
              ? (showReminder ? '2fr 1fr 1fr 60px 110px 120px 120px 120px 200px' : '2fr 1fr 1fr 60px 110px 120px 120px 200px')
              : (showReminder ? '2fr 1fr 60px 110px 120px 120px 120px 200px' : '2fr 1fr 60px 110px 120px 120px 200px'),
          }}
        >
          {/* Task name */}
          <div className="flex items-center gap-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={async () => {
                  setEditingName(false)
                  if (nameVal.trim() && nameVal !== task.name) {
                    const oldName = task.name
                    const fd = new FormData()
                    fd.set('name', nameVal.trim())
                    await updateTask(task.id, fd)
                    showUndo('Task name updated', () => {
                      setNameVal(oldName)
                      save('name', oldName)
                    })
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
                className="font-medium text-gray-900 text-left hover:text-emerald-600 transition-colors py-1 text-sm"
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
              const old = vals.responsible
              setVals(v => ({ ...v, responsible: e.target.value }))
              save('responsible', e.target.value)
              showUndo('Responsible updated', () => {
                setVals(v => ({ ...v, responsible: old }))
                save('responsible', old)
              })
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {people.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Priority */}
          <button
            onClick={() => {
              const next = vals.priority === 'high' ? 'medium' : vals.priority === 'medium' ? 'low' : 'high'
              const old = vals.priority
              setVals(v => ({ ...v, priority: next }))
              save('priority', next)
              showUndo('Priority updated', () => {
                setVals(v => ({ ...v, priority: old }))
                save('priority', old)
              })
            }}
            className={`text-xs font-semibold px-1.5 py-0.5 rounded transition-colors ${
              vals.priority === 'high' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
              vals.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
              'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {vals.priority === 'high' ? 'P1' : vals.priority === 'medium' ? 'P2' : 'P3'}
          </button>

          {/* Status */}
          <select
            value={vals.status}
            onChange={e => {
              const old = vals.status
              const v = e.target.value as Task['status']
              setVals(s => ({ ...s, status: v }))
              save('status', v)
              showUndo('Status updated', () => {
                setVals(s => ({ ...s, status: old }))
                save('status', old)
              })
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
              const old = vals.due_date
              setVals(v => ({ ...v, due_date: e.target.value }))
              save('due_date', e.target.value)
              showUndo('Due date updated', () => {
                setVals(v => ({ ...v, due_date: old }))
                save('due_date', old)
              })
            }}
            className={`${dateClass} ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}
          />

          {/* Reminder date — only visible to Dani */}
          {showReminder && (
            <input
              type="date"
              value={vals.followup_date}
              onChange={e => {
                const old = vals.followup_date
                setVals(v => ({ ...v, followup_date: e.target.value }))
                save('followup_date', e.target.value)
                showUndo('Reminder updated', () => {
                  setVals(v => ({ ...v, followup_date: old }))
                  save('followup_date', old)
                })
              }}
              className={`${dateClass} text-emerald-500`}
            />
          )}

          {/* Waiting on */}
          <select
            value={vals.waiting_on}
            onChange={e => {
              const old = vals.waiting_on
              setVals(v => ({ ...v, waiting_on: e.target.value }))
              save('waiting_on', e.target.value)
              showUndo('Waiting on updated', () => {
                setVals(v => ({ ...v, waiting_on: old }))
                save('waiting_on', old)
              })
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {people.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Notes — click to open modal */}
          <button
            onClick={() => setNotesModalOpen(true)}
            className="text-xs text-gray-500 truncate block w-full text-left hover:text-gray-800 transition-colors"
            title={notesVal || 'Click to add a note'}
          >
            {notesVal || <span className="text-gray-300">—</span>}
          </button>
        </div>
      </div>

      {notesModalOpen && (
        <NotesModal
          taskName={task.name}
          initialValue={notesVal}
          onSave={value => {
            setNotesModalOpen(false)
            if (value !== (task.notes ?? '')) {
              const oldNotes = task.notes ?? ''
              setNotesVal(value)
              save('notes', value)
              showUndo('Note saved', () => {
                setNotesVal(oldNotes)
                save('notes', oldNotes)
              })
            }
          }}
          onCancel={() => setNotesModalOpen(false)}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          onUndo={() => { toast.undo(); setToast(null) }}
          onDismiss={dismissToast}
          durationMs={10000}
        />
      )}
    </>
  )
}
