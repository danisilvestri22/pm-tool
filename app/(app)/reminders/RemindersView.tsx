'use client'
import { useState } from 'react'
import { format, addHours, addDays } from 'date-fns'
import { Bell, Check, Clock, Trash2, Plus, ChevronDown } from 'lucide-react'
import { createReminder, snoozeReminder, completeReminder, deleteReminder } from '@/app/(app)/actions/reminders'

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
  snoozed: Reminder[]
  completed: Reminder[]
}

function SnoozeMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false)

  const options = [
    { label: '1 hour', until: addHours(new Date(), 1).toISOString() },
    { label: 'Tomorrow', until: addDays(new Date(), 1).toISOString() },
    { label: '3 days', until: addDays(new Date(), 3).toISOString() },
    { label: '1 week', until: addDays(new Date(), 7).toISOString() },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
      >
        <Clock size={12} />
        Snooze
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 bg-white border rounded-lg shadow-lg z-10 min-w-28 py-1">
          {options.map(o => (
            <button
              key={o.label}
              onClick={async () => {
                setOpen(false)
                await snoozeReminder(id, o.until)
              }}
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

function ReminderRow({ r, dim }: { r: Reminder; dim?: boolean }) {
  const isOverdue = r.due_date && !r.completed_at && new Date(r.due_date) < new Date()

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 ${dim ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${r.completed_at ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {r.title}
        </p>
        {r.details && (
          <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{r.details}</p>
        )}
        {r.due_date && (
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            Due {format(new Date(r.due_date), 'MMM d, yyyy')}
            {isOverdue ? ' — overdue' : ''}
          </p>
        )}
        {r.snoozed_until && !r.completed_at && (
          <p className="text-xs text-indigo-500 mt-0.5">
            Snoozed until {format(new Date(r.snoozed_until), 'MMM d, h:mm a')}
          </p>
        )}
      </div>
      {!r.completed_at && (
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          <SnoozeMenu id={r.id} />
          <button
            onClick={() => completeReminder(r.id)}
            className="text-gray-400 hover:text-green-500 transition-colors"
            aria-label="Mark done"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => deleteReminder(r.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
      {r.completed_at && (
        <button
          onClick={() => deleteReminder(r.id)}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
          aria-label="Delete"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

export default function RemindersView({ active, snoozed, completed }: Props) {
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const inputClass = 'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createReminder(fd)
    if (result?.success) {
      setAdding(false)
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-indigo-500" />
          <h1 className="text-xl font-semibold text-gray-900">Reminders</h1>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          Add reminder
        </button>
      </div>

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
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {active.length === 0 && snoozed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active reminders.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="bg-white border rounded-xl overflow-hidden mb-4">
              {active.map(r => <ReminderRow key={r.id} r={r} />)}
            </div>
          )}

          {snoozed.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-1 mb-2">Snoozed</p>
              <div className="bg-white border rounded-xl overflow-hidden">
                {snoozed.map(r => <ReminderRow key={r.id} r={r} dim />)}
              </div>
            </div>
          )}
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
            <div className="bg-white border rounded-xl overflow-hidden">
              {completed.map(r => <ReminderRow key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
