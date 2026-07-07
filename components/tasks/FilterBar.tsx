'use client'
import { useState, useRef, useEffect } from 'react'
import type { Status, Priority } from '@/types/database'

export interface Filters {
  statuses: Status[]
  priority: Priority | ''
  responsible: string
  company: string
  sortBy: 'due_date' | 'priority' | 'status' | 'created_at'
}

export const defaultFilters: Filters = {
  statuses: [],
  priority: '',
  responsible: '',
  company: '',
  sortBy: 'due_date',
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'not_started',         label: 'Not Started' },
  { value: 'in_progress',         label: 'In Progress' },
  { value: 'waiting_on_response', label: 'Waiting on Response' },
  { value: 'blocked',             label: 'Blocked' },
  { value: 'at_risk',             label: 'Overdue / At Risk' },
  { value: 'done',                label: 'Done' },
]

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  companies?: Record<string, string>
  people?: string[]
}

function StatusMultiSelect({ statuses, onChange }: { statuses: Status[]; onChange: (s: Status[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(value: Status) {
    onChange(
      statuses.includes(value)
        ? statuses.filter(s => s !== value)
        : [...statuses, value]
    )
  }

  const label =
    statuses.length === 0
      ? 'All statuses'
      : statuses.length === 1
      ? STATUS_OPTIONS.find(o => o.value === statuses[0])?.label ?? '1 selected'
      : `${statuses.length} statuses`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white flex items-center gap-1.5"
      >
        {statuses.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        )}
        {label}
        <svg className="w-3.5 h-3.5 text-gray-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-white border rounded-xl shadow-lg py-1 min-w-[200px]">
          {statuses.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 hover:bg-gray-50"
              >
                Clear selection
              </button>
              <div className="border-t mx-2 my-1" />
            </>
          )}
          {STATUS_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={statuses.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({ filters, onChange, companies, people }: Props) {
  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value })

  const inputClass =
    'border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {companies && Object.keys(companies).length > 0 && (
        <select value={filters.company} onChange={set('company')} className={inputClass}>
          <option value="">All companies</option>
          {Object.entries(companies).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      )}
      <StatusMultiSelect statuses={filters.statuses} onChange={statuses => onChange({ ...filters, statuses })} />
      <select value={filters.priority} onChange={set('priority')} className={inputClass}>
        <option value="">All priorities</option>
        <option value="high">P1 — High</option>
        <option value="medium">P2 — Medium</option>
        <option value="low">P3 — Low</option>
      </select>
      {people && people.length > 0 ? (
        <select value={filters.responsible} onChange={set('responsible')} className={inputClass}>
          <option value="">All people</option>
          {people.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      ) : (
        <input
          value={filters.responsible}
          onChange={set('responsible')}
          placeholder="Filter by person…"
          className={`${inputClass} w-36`}
        />
      )}
      <select value={filters.sortBy} onChange={set('sortBy')} className={inputClass}>
        <option value="due_date">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
        <option value="status">Sort: Status</option>
        <option value="created_at">Sort: Newest</option>
      </select>
    </div>
  )
}
