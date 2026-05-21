import type { Priority } from '@/types/database'

const config: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'text-red-600' },
  medium: { label: 'Medium', className: 'text-yellow-600' },
  low: { label: 'Low', className: 'text-gray-400' },
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = config[priority]
  return <span className={`text-xs font-medium ${className}`}>{label}</span>
}
