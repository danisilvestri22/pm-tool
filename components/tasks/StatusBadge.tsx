import type { Status } from '@/types/database'

const config: Record<Status, { label: string; className: string }> = {
  on_track: { label: 'On track', className: 'bg-green-50 text-green-700' },
  at_risk: { label: 'At risk', className: 'bg-red-50 text-red-700' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-500' },
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
