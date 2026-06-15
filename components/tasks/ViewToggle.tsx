'use client'
import { List, LayoutGrid } from 'lucide-react'

interface Props {
  view: 'list' | 'board'
  onChange: (v: 'list' | 'board') => void
}

export default function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex border rounded-lg overflow-hidden">
      {(['list', 'board'] as const).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
            view === v ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {v === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  )
}
