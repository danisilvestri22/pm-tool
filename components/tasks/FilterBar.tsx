'use client'
import type { Status, Priority } from '@/types/database'

export interface Filters {
  status: Status | ''
  priority: Priority | ''
  responsible: string
  sortBy: 'due_date' | 'priority' | 'status' | 'created_at'
}

export const defaultFilters: Filters = {
  status: '',
  priority: '',
  responsible: '',
  sortBy: 'due_date',
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FilterBar({ filters, onChange }: Props) {
  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value })

  const inputClass =
    'border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select value={filters.status} onChange={set('status')} className={inputClass}>
        <option value="">All statuses</option>
        <option value="on_track">On track</option>
        <option value="at_risk">At risk</option>
        <option value="completed">Completed</option>
      </select>
      <select value={filters.priority} onChange={set('priority')} className={inputClass}>
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <input
        value={filters.responsible}
        onChange={set('responsible')}
        placeholder="Filter by person…"
        className={`${inputClass} w-36`}
      />
      <select value={filters.sortBy} onChange={set('sortBy')} className={inputClass}>
        <option value="due_date">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
        <option value="status">Sort: Status</option>
        <option value="created_at">Sort: Newest</option>
      </select>
    </div>
  )
}
