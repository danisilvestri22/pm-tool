'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { Bell, Check, Clock, Trash2, Plus, ChevronDown, ChevronRight, Pencil, Pin } from 'lucide-react'
import { createReminder, updateReminder, snoozeReminder, unsnoozeReminder, completeReminder, deleteReminder, getMyTasks, unpinTask, setTaskReminderDate } from '@/app/(app)/actions/reminders'
import StatusBadge from '@/components/tasks/StatusBadge'
import type { Task } from '@/types/database'

interface Reminder {
  id: string
  title: string
  details: string | null
  due_date: string | null
  snoozed_until: string | null
  completed_at: string | null
  created_at: string
}

interface Props {
  active: Reminder[]
  completed: Reminder[]
  pinnedTasks: Task[]
  reminderDates: Record<string, string | null>
  companies: Record<string, string>
  people: string[]
}

type ListItem =
  | { kind: 'reminder'; data: Reminder }
  | { kind: 'task'; data: Task; pinned: boolean; reminderDate: string | null }

type GroupKey = 'overdue' | 'today' | 'next' | 'scheduled' | 'unscheduled'

const GROUPS: { key: GroupKey; label: string; defaultOpen: boolean }[] = [
  { key: 'overdue',     label: 'Overdue',       defaultOpen: true  },
  { key: 'today',       label: 'Today',          defaultOpen: true  },
  { key: 'next',        label: 'Next · 7 days',  defaultOpen: true  },
  { key: 'scheduled',   label: 'Scheduled',      defaultOpen: false },
  { key: 'unscheduled', label: 'Unscheduled',    defaultOpen: false },
]

function getGroup(dueDate: string | null): GroupKey {
  if (!dueDate) return 'unscheduled'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 7) return 'next'
  return 'scheduled'
}

function SnoozeMenu({ id, snoozedUntil }: { id: string; snoozedUntil: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isSnoozed = !!snoozedUntil && snoozedUntil > new Date().toISOString()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  const options = [
    { label: 'Tomorrow', until: addDays(new Date(), 1).toISOString() },
    { label: '2 days',   until: addDays(new Date(), 2).toISOString() },
    { label: 'Next week', until: addDays(new Date(), 7).toISOString() },
  ]
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs transition-colors ${isSnoozed ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-emerald-600'}`}
      >
        <Clock size={12} />
        Snooze
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 bg-white border rounded-lg shadow-lg z-50 min-w-28 py-1">
          {isSnoozed && (
            <button
              onClick={async () => { setOpen(false); await unsnoozeReminder(id) }}
              className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 hover:bg-gray-50 font-medium border-b border-gray-100"
            >
              Unsnooze
            </button>
          )}
          {options.map(o => (
            <button
              key={o.label}
              onClick={async () => { setOpen(false); await snoozeReminder(id, o.until) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ReminderRow({ r }: { r: Reminder }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const isSnoozed = !!r.snoozed_until && r.snoozed_until > new Date().toISOString()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const isOverdue = !isSnoozed && r.due_date && !r.completed_at && new Date(r.due_date + 'T12:00:00') < todayStart

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const result = await updateReminder(r.id, fd)
    if (!result.error) setEditing(false)
    setSaving(false)
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="px-4 py-3 border-b last:border-0 space-y-2">
        <input name="title" defaultValue={r.title} required autoFocus placeholder="Reminder title"
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <textarea name="details" defaultValue={r.details ?? ''} rows={2} placeholder="Details (optional)"
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        <input type="date" name="due_date" defaultValue={r.due_date ?? ''}
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${r.completed_at ? 'line-through text-gray-400' : 'text-gray-900'}`}>{r.title}</p>
        {r.details && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{r.details}</p>}
        {r.due_date && (
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            Due {format(new Date(r.due_date + 'T12:00:00'), 'MMM d, yyyy')}{isOverdue ? ' — overdue' : ''}
          </p>
        )}
        {isSnoozed && (
          <p className="text-xs mt-1 text-amber-500 flex items-center gap-1">
            <Clock size={10} />
            Snoozed until {format(new Date(r.snoozed_until!.slice(0, 10) + 'T12:00:00'), 'MMM d')}
          </p>
        )}
      </div>
      {!r.completed_at && (
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Edit">
            <Pencil size={13} />
          </button>
          <SnoozeMenu id={r.id} snoozedUntil={r.snoozed_until} />
          <button onClick={() => completeReminder(r.id)} className="text-gray-400 hover:text-green-500 transition-colors" aria-label="Mark done">
            <Check size={14} />
          </button>
          <button onClick={() => deleteReminder(r.id)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      )}
      {r.completed_at && (
        <button onClick={() => deleteReminder(r.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5" aria-label="Delete">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function TaskItem({ task, pinned, reminderDate: initialReminderDate, companies }: { task: Task; pinned: boolean; reminderDate: string | null; companies: Record<string, string> }) {
  const [localPinned, setLocalPinned] = useState(pinned)
  const [reminderDate, setReminderDate] = useState(initialReminderDate ?? '')
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const isOverdue = reminderDate && new Date(reminderDate + 'T12:00:00') < todayStart

  async function handleUnpin() {
    setLocalPinned(false)
    const result = await unpinTask(task.id)
    if (result?.error) setLocalPinned(true)
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setReminderDate(val)
    await setTaskReminderDate(task.id, val || null)
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{task.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {companies[task.company_id] && (
            <span className="text-xs text-gray-400">{companies[task.company_id]}</span>
          )}
          {localPinned && (
            <input
              type="date"
              value={reminderDate}
              onChange={handleDateChange}
              className={`text-xs border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer ${
                isOverdue ? 'text-red-500 font-medium' : reminderDate ? 'text-emerald-600' : 'text-gray-400'
              }`}
              title="Set reminder date for this tab only"
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <StatusBadge status={task.status} />
        {localPinned && (
          <button
            onClick={handleUnpin}
            className="text-emerald-500 hover:text-gray-400 transition-colors"
            title="Unpin from Reminders"
          >
            <Pin size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function GroupSection({
  groupKey,
  label,
  items,
  companies,
  defaultOpen,
}: {
  groupKey: GroupKey
  label: string
  items: ListItem[]
  companies: Record<string, string>
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null

  const borderColor = groupKey === 'overdue' ? 'border-red-200' : 'border-gray-200'

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-1 py-1.5 text-left"
      >
        {open ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${groupKey === 'overdue' ? 'text-red-500' : groupKey === 'today' ? 'text-amber-600' : 'text-gray-500'}`}>
          {label}
        </span>
        <span className="text-xs text-gray-400">{items.length}</span>
      </button>
      {open && (
        <div className={`bg-white border ${borderColor} rounded-xl overflow-hidden`}>
          {items.map((item) =>
            item.kind === 'reminder'
              ? <ReminderRow key={`r-${item.data.id}`} r={item.data} />
              : <TaskItem key={`t-${item.data.id}`} task={item.data} pinned={item.pinned} reminderDate={item.reminderDate} companies={companies} />
          )}
        </div>
      )}
    </div>
  )
}

export default function RemindersView({ active, completed, pinnedTasks, reminderDates, companies, people }: Props) {
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showTasks, setShowTasks] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('reminders_show_tasks') === 'true' : false)
  const [myName, setMyName] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('reminders_my_name') ?? '') : '')
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  useEffect(() => {
    localStorage.setItem('reminders_show_tasks', showTasks ? 'true' : 'false')
    if (!showTasks) { setMyTasks([]); return }
    if (!myName) return
    setLoadingTasks(true)
    getMyTasks(myName).then(tasks => { setMyTasks(tasks); setLoadingTasks(false) })
  }, [showTasks, myName])

  useEffect(() => {
    localStorage.setItem('reminders_my_name', myName)
  }, [myName])

  const allItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = active.map(r => ({ kind: 'reminder', data: r }))
    const seen = new Set<string>()
    for (const task of pinnedTasks) {
      seen.add(task.id)
      items.push({ kind: 'task', data: task, pinned: true, reminderDate: reminderDates[task.id] ?? null })
    }
    if (showTasks) {
      for (const task of myTasks) {
        if (!seen.has(task.id)) {
          seen.add(task.id)
          items.push({ kind: 'task', data: task, pinned: false, reminderDate: null })
        }
      }
    }
    return items
  }, [active, pinnedTasks, myTasks, showTasks, reminderDates])

  function itemDate(item: ListItem): string | null {
    if (item.kind === 'reminder') {
      const r = item.data
      if (r.snoozed_until && r.snoozed_until > new Date().toISOString()) return r.snoozed_until.slice(0, 10)
      return r.due_date
    }
    return item.reminderDate
  }

  function itemsForGroup(key: GroupKey): ListItem[] {
    return allItems
      .filter(item => getGroup(itemDate(item)) === key)
      .sort((a, b) => {
        const da = itemDate(a)
        const db = itemDate(b)
        if (!da) return 1
        if (!db) return -1
        return da.localeCompare(db)
      })
  }

  const inputClass = 'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createReminder(fd)
    if (result?.success) { setAdding(false); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-emerald-500" />
          <h1 className="text-xl font-semibold text-gray-900">Reminders</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTasks(t => !t)}
            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
              showTasks
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Show my project tasks
          </button>
          <button
            onClick={() => setAdding(a => !a)}
            className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus size={14} />
            Add reminder
          </button>
        </div>
      </div>

      {showTasks && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Assigned to:</span>
          <select
            value={myName}
            onChange={e => setMyName(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">— pick a name —</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {loadingTasks && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
      )}

      {adding && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reminder *</label>
            <input name="title" required placeholder="What do you need to remember?" className={inputClass} autoFocus />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Details</label>
            <textarea name="details" rows={2} placeholder="Any extra context…" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Due date</label>
            <input type="date" name="due_date" className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {allItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active reminders.</p>
        </div>
      ) : (
        <>
          {GROUPS.map(g => (
            <GroupSection
              key={g.key}
              groupKey={g.key}
              label={g.label}
              items={itemsForGroup(g.key)}
              companies={companies}
              defaultOpen={g.defaultOpen}
            />
          ))}

        </>
      )}

      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 mb-2"
          >
            {showCompleted ? 'Hide' : 'Show'} {completed.length} completed
          </button>
          {showCompleted && (
            <div className="bg-white border rounded-xl">
              {completed.map(r => <ReminderRow key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
