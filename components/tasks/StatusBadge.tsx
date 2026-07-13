import type { Status } from '@/types/database'

const config: Record<Status, { label: string; className: string }> = {
  not_started:        { label: 'Not Started',          className: 'bg-gray-100 text-gray-500' },
  in_progress:        { label: 'In Progress',           className: 'bg-blue-50 text-blue-700' },
  waiting_on_response:{ label: 'Waiting on Response',   className: 'bg-yellow-50 text-yellow-700' },
  blocked:            { label: 'Blocked',               className: 'bg-orange-50 text-orange-700' },
  at_risk:            { label: 'Overdue / At Risk',     className: 'bg-red-50 text-red-700' },
  done:               { label: 'Done',                  className: 'bg-green-50 text-green-700' },
  future:             { label: 'Future',                className: 'bg-purple-50 text-purple-700' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
