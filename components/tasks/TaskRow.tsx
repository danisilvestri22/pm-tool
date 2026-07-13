'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Pin, ChevronRight, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { updateTask, createSubtask, softDeleteTask } from '@/app/(app)/actions/tasks'
import { pinTask, unpinTask } from '@/app/(app)/actions/reminders'
import type { Task } from '@/types/database'
import Toast from '@/components/ui/Toast'

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtasks?: Task[]
  people?: string[]
  showReminder?: boolean
  pinnedTaskIds?: string[]
  onSelect: (task: Task) => void
}

function gridCols(showCompany: boolean, showReminder: boolean): string {
  return showCompany
    ? (showReminder
        ? 'minmax(300px,4fr) 120px 120px 55px 100px 100px 100px 100px 140px'
        : 'minmax(300px,4fr) 120px 120px 55px 100px 100px 100px 140px')
    : (showReminder
        ? 'minmax(300px,4fr) 120px 55px 100px 100px 100px 100px 140px'
        : 'minmax(300px,4fr) 120px 55px 100px 100px 100px 140px')
}

function SubtaskRow({ task, people, showCompany, showReminder, onDelete }: {
  task: Task
  people: string[]
  showCompany: boolean
  showReminder: boolean
  onDelete: () => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(task.name)
  const [vals, setVals] = useState({
    responsible: task.responsible ?? '',
    status: task.status,
    due_date: task.due_date ?? '',
  })

  useEffect(() => {
    setNameVal(task.name)
    setVals({ responsible: task.responsible ?? '', status: task.status, due_date: task.due_date ?? '' })
  }, [task])

  async function save(field: string, value: string) {
    const fd = new FormData()
    fd.set(field, value)
    await updateTask(task.id, fd)
  }

  const selectClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer max-w-full'
  const statusColor =
    vals.status === 'done' ? 'text-green-700' :
    vals.status === 'at_risk' ? 'text-red-600' :
    vals.status === 'blocked' ? 'text-orange-600' :
    vals.status === 'waiting_on_response' ? 'text-yellow-700' :
    vals.status === 'not_started' ? 'text-gray-500' : 'text-blue-700'

  return (
    <div
      className="group/sub hidden sm:grid items-center gap-3 pr-4 py-1.5 text-sm bg-gray-50/70 border-l-[3px] border-emerald-200"
      style={{ gridTemplateColumns: gridCols(showCompany, showReminder) }}
    >
      <div className="flex items-center gap-2 min-w-0 pl-6">
        <button
          onClick={() => {
            const next = vals.status === 'done' ? 'not_started' : 'done'
            setVals(v => ({ ...v, status: next }))
            save('status', next)
          }}
          className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            vals.status === 'done'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400'
          }`}
          title={vals.status === 'done' ? 'Mark incomplete' : 'Mark done'}
        >
          {vals.status === 'done' && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={() => {
              if (!nameVal.trim()) { onDelete(); return }
              setEditingName(false)
              if (nameVal !== task.name) save('name', nameVal.trim())
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (!nameVal.trim()) { onDelete(); return }
                e.currentTarget.blur()
              }
              if (e.key === 'Escape') { setNameVal(task.name); setEditingName(false) }
            }}
            className="text-sm text-gray-700 w-full border-b border-emerald-400 focus:outline-none bg-transparent"
          />
        ) : (
          <span
            className={`text-sm cursor-pointer break-words ${vals.status === 'done' ? 'line-through text-gray-400' : 'text-gray-600 hover:text-emerald-600'}`}
            onClick={() => setEditingName(true)}
            title="Click to edit"
          >
            {nameVal}
          </span>
        )}
      </div>

      {showCompany && <span />}

      <select value={vals.responsible}
        onChange={e => { setVals(v => ({ ...v, responsible: e.target.value })); save('responsible', e.target.value) }}
        className={selectClass}>
        <option value="">—</option>
        {people.map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      <span />

      <select value={vals.status}
        onChange={e => { const v = e.target.value as Task['status']; setVals(s => ({ ...s, status: v })); save('status', v) }}
        className={`${selectClass} ${statusColor}`}>
        <option value="not_started">Not Started</option>
        <option value="in_progress">In Progress</option>
        <option value="waiting_on_response">Waiting on Response</option>
        <option value="blocked">Blocked</option>
        <option value="at_risk">At Risk</option>
        <option value="future">Future</option>
        <option value="done">Done</option>
      </select>

      <input type="date" value={vals.due_date}
        onChange={e => { setVals(v => ({ ...v, due_date: e.target.value })); save('due_date', e.target.value) }}
        className="text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer w-full" />

      {showReminder && <span />}
      <span />

      <button onClick={() => { if (window.confirm('Delete this subtask?')) onDelete() }} className="text-transparent group-hover/sub:text-gray-300 hover:!text-red-400 transition-colors" title="Delete subtask">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function AddSubtaskRow({ parentId, companyId, showCompany, showReminder }: {
  parentId: string
  companyId: string
  showCompany: boolean
  showReminder: boolean
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!name.trim() || saving) return
    setSaving(true)
    await createSubtask(parentId, name.trim(), companyId)
    setName('')
    setSaving(false)
  }

  const emptyCount = 6 + (showCompany ? 1 : 0) + (showReminder ? 1 : 0)

  return (
    <div
      className="hidden sm:grid items-center gap-3 pr-4 py-1.5 text-sm bg-gray-50/70 border-l-[3px] border-emerald-200 border-t border-t-gray-100"
      style={{ gridTemplateColumns: gridCols(showCompany, showReminder) }}
    >
      <div className="pl-10">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="Add subtask…"
          disabled={saving}
          className="text-sm placeholder:text-gray-300 text-gray-600 w-full bg-transparent focus:outline-none disabled:opacity-50"
        />
      </div>
      {Array.from({ length: emptyCount }).map((_, i) => <span key={i} />)}
    </div>
  )
}

function NotesModal({ taskName, initialValue, onSave, onCancel }: {
  taskName: string
  initialValue: string
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 text-sm truncate pr-4">{taskName}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <textarea autoFocus value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
          rows={8} placeholder="Add a note…"
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        <div className="flex gap-2 mt-3 justify-end">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
          <button onClick={() => onSave(value)} className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700">Save</button>
        </div>
      </div>
    </div>
  )
}

export default function TaskRow({ task, showCompany, companyName, subtasks = [], people = [], showReminder = false, pinnedTaskIds = [], onSelect }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(task.name)
  const [notesVal, setNotesVal] = useState(task.notes ?? '')
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [subtasksExpanded, setSubtasksExpanded] = useState(false)
  const [vals, setVals] = useState({
    responsible: task.responsible ?? '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? '',
    followup_date: task.followup_date ?? '',
    waiting_on: task.waiting_on ?? '',
  })
  const [toast, setToast] = useState<{ id: number; message: string; undo: () => void } | null>(null)
  const [pinned, setPinned] = useState(pinnedTaskIds.includes(task.id))
  const toastIdRef = useRef(0)

  useEffect(() => {
    setNameVal(task.name)
    setPinned(pinnedTaskIds.includes(task.id))
    setNotesVal(task.notes ?? '')
    setVals({
      responsible: task.responsible ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? '',
      followup_date: task.followup_date ?? '',
      waiting_on: task.waiting_on ?? '',
    })
  }, [task, pinnedTaskIds])

  async function handlePinToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !pinned
    setPinned(next)
    const result = next ? await pinTask(task.id) : await unpinTask(task.id)
    if (result?.error) setPinned(!next)
  }

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

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const isOverdue = vals.due_date && vals.status !== 'done' && new Date(vals.due_date + 'T12:00:00') < todayStart

  const selectClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer max-w-full'
  const dateClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer w-[120px]'

  const statusColor =
    vals.status === 'done' ? 'text-green-700' :
    vals.status === 'at_risk' ? 'text-red-600' :
    vals.status === 'blocked' ? 'text-orange-600' :
    vals.status === 'waiting_on_response' ? 'text-yellow-700' :
    vals.status === 'not_started' ? 'text-gray-500' :
    vals.status === 'future' ? 'text-purple-700' :
    'text-blue-700'

  const statusBg =
    vals.status === 'done' ? 'bg-green-50' :
    vals.status === 'at_risk' ? 'bg-red-50' :
    vals.status === 'blocked' ? 'bg-orange-50' :
    vals.status === 'waiting_on_response' ? 'bg-yellow-50' :
    vals.status === 'not_started' ? 'bg-gray-100' :
    vals.status === 'future' ? 'bg-purple-50' :
    'bg-blue-50'

  return (
    <>
      <div>
        {/* Main task row */}
        <div className={`w-full border-l-2 transition-colors ${
          vals.status === 'at_risk' ? 'border-red-400 bg-red-50/30' : 'border-transparent hover:bg-gray-50/50'
        }`}>
          {/* Mobile */}
          <div className="flex items-center gap-3 px-4 py-3 sm:hidden" onClick={() => onSelect(task)}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate text-sm">
                {task.name}
                {subtasks.length > 0 && <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtasks.length})</span>}
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
                vals.status === 'done' ? 'bg-green-100 text-green-700' :
                vals.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                vals.status === 'blocked' ? 'bg-orange-100 text-orange-700' :
                vals.status === 'waiting_on_response' ? 'bg-yellow-100 text-yellow-700' :
                vals.status === 'not_started' ? 'bg-gray-100 text-gray-500' :
                vals.status === 'future' ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {vals.status === 'not_started' ? 'Not Started' :
                 vals.status === 'in_progress' ? 'In Progress' :
                 vals.status === 'waiting_on_response' ? 'Waiting' :
                 vals.status === 'blocked' ? 'Blocked' :
                 vals.status === 'at_risk' ? 'At Risk' :
                 vals.status === 'future' ? 'Future' : 'Done'}
              </span>
              {vals.due_date && (
                <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {format(new Date(vals.due_date + 'T12:00:00'), 'MMM d')}
                </span>
              )}
            </div>
          </div>

          {/* Desktop */}
          <div
            className="hidden sm:grid items-center gap-3 px-4 py-1.5 text-sm cursor-pointer"
            style={{ gridTemplateColumns: gridCols(!!showCompany, showReminder) }}
            onClick={e => {
              if ((e.target as HTMLElement).closest('button, select, input, a')) return
              onSelect(task)
            }}
          >
            {/* Task name cell */}
            <div className="group/row flex items-center gap-1 min-w-0">
              <button
                onClick={() => setSubtasksExpanded(e => !e)}
                className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                title={subtasksExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
              >
                {subtasksExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

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
                      showUndo('Task name updated', () => { setNameVal(oldName); save('name', oldName) })
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
                <>
                  <button
                    onClick={() => onSelect(task)}
                    className="font-medium text-gray-900 text-left hover:text-emerald-600 transition-colors py-1 text-sm flex-1 min-w-0"
                    title="Click to open"
                  >
                    {nameVal}
                    {subtasks.length > 0 && (
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtasks.length})</span>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingName(true)}
                    className="shrink-0 text-transparent group-hover/row:text-gray-300 hover:!text-emerald-400 transition-colors"
                    title="Edit name"
                  >
                    <Pencil size={11} />
                  </button>
                </>
              )}

              <button
                onClick={handlePinToggle}
                className={`shrink-0 transition-colors ${
                  pinned ? 'text-emerald-500' : 'text-transparent group-hover/row:text-gray-300 hover:!text-emerald-400'
                }`}
                title={pinned ? 'Unpin from Reminders' : 'Pin to Reminders'}
              >
                <Pin size={12} />
              </button>
            </div>

            {showCompany && (
              <span className="text-gray-500 text-xs line-clamp-2" title={companyName}>{companyName ?? '—'}</span>
            )}

            <select value={vals.responsible}
              onChange={e => {
                const old = vals.responsible
                setVals(v => ({ ...v, responsible: e.target.value }))
                save('responsible', e.target.value)
                showUndo('Responsible updated', () => { setVals(v => ({ ...v, responsible: old })); save('responsible', old) })
              }}
              className={selectClass}>
              <option value="">—</option>
              {people.map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <button
              onClick={() => {
                const next = vals.priority === 'high' ? 'medium' : vals.priority === 'medium' ? 'low' : 'high'
                const old = vals.priority
                setVals(v => ({ ...v, priority: next }))
                save('priority', next)
                showUndo('Priority updated', () => { setVals(v => ({ ...v, priority: old })); save('priority', old) })
              }}
              className={`text-xs font-semibold px-1.5 py-0.5 rounded transition-colors ${
                vals.priority === 'high' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                vals.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {vals.priority === 'high' ? 'P1' : vals.priority === 'medium' ? 'P2' : 'P3'}
            </button>

            <select value={vals.status}
              onChange={e => {
                const old = vals.status
                const v = e.target.value as Task['status']
                setVals(s => ({ ...s, status: v }))
                save('status', v)
                showUndo('Status updated', () => { setVals(s => ({ ...s, status: old })); save('status', old) })
              }}
              className={`text-xs border border-transparent rounded-full px-2 py-0.5 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 hover:opacity-80 transition-opacity ${statusColor} ${statusBg}`}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_response">Waiting on Response</option>
              <option value="blocked">Blocked</option>
              <option value="at_risk">Overdue / At Risk</option>
              <option value="future">Future</option>
              <option value="done">Done</option>
            </select>

            <input type="date" value={vals.due_date}
              onChange={e => {
                const old = vals.due_date
                setVals(v => ({ ...v, due_date: e.target.value }))
                save('due_date', e.target.value)
                showUndo('Due date updated', () => { setVals(v => ({ ...v, due_date: old })); save('due_date', old) })
              }}
              className={`${dateClass} ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`} />

            {showReminder && (
              <input type="date" value={vals.followup_date}
                onChange={e => {
                  const old = vals.followup_date
                  setVals(v => ({ ...v, followup_date: e.target.value }))
                  save('followup_date', e.target.value)
                  showUndo('Reminder updated', () => { setVals(v => ({ ...v, followup_date: old })); save('followup_date', old) })
                }}
                className={`${dateClass} text-emerald-500`} />
            )}

            <select value={vals.waiting_on}
              onChange={e => {
                const old = vals.waiting_on
                setVals(v => ({ ...v, waiting_on: e.target.value }))
                save('waiting_on', e.target.value)
                showUndo('Waiting on updated', () => { setVals(v => ({ ...v, waiting_on: old })); save('waiting_on', old) })
              }}
              className={selectClass}>
              <option value="">—</option>
              {people.map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <button
              onClick={() => setNotesModalOpen(true)}
              className="text-xs text-gray-500 truncate block w-full text-left hover:text-gray-800 transition-colors"
              title={notesVal || 'Click to add a note'}
            >
              {notesVal || <span className="text-gray-300">—</span>}
            </button>
          </div>
        </div>

        {/* Subtask rows */}
        {subtasksExpanded && (
          <>
            {subtasks.map(s => (
              <SubtaskRow
                key={s.id}
                task={s}
                people={people}
                showCompany={!!showCompany}
                showReminder={showReminder}
                onDelete={async () => { await softDeleteTask(s.id) }}
              />
            ))}
            <AddSubtaskRow
              parentId={task.id}
              companyId={task.company_id}
              showCompany={!!showCompany}
              showReminder={showReminder}
            />
          </>
        )}
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
              showUndo('Note saved', () => { setNotesVal(oldNotes); save('notes', oldNotes) })
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
