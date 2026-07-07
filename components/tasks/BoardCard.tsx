'use client'
import { useDraggable } from '@dnd-kit/core'
import { format } from 'date-fns'
import StatusBadge from './StatusBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  subtaskCount?: number
  onSelect: (task: Task) => void
}

export default function BoardCard({ task, subtaskCount = 0, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const isOverdue =
    task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task)}
      className={`w-full text-left bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow select-none ${
        isDragging ? 'cursor-grabbing opacity-50 shadow-lg' : 'cursor-grab'
      }`}
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{task.name}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={task.status} />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {subtaskCount > 0 && <span>{subtaskCount} subtasks</span>}
          {task.due_date && (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.responsible && (
            <span className="truncate max-w-[80px]">{task.responsible}</span>
          )}
        </div>
      </div>
    </div>
  )
}
