'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  onSelectTask?: (task: Task) => void
  selectedTaskId?: string | null
}

export default function TaskList({
  tasks,
  showCompany,
  companies = {},
  onSelectTask,
  selectedTaskId,
}: Props) {
  const [internalSelected, setInternalSelected] = useState<Task | null>(null)
  const handleSelect = onSelectTask ?? ((t: Task) => setInternalSelected(t))

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Waiting on']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Waiting on']

  const subtaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})

  const topLevel = tasks.filter(t => !t.parent_task_id)

  if (topLevel.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No tasks yet.</p>
        <p className="text-sm mt-1">Add your first task using the button above.</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <div
        className="grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
        style={{
          gridTemplateColumns: showCompany
            ? '2fr 1fr 1fr 90px 80px 90px'
            : '2fr 1fr 90px 80px 90px',
        }}
      >
        {columns.map(col => (
          <span key={col}>{col}</span>
        ))}
      </div>
      <div className="divide-y divide-gray-50">
        {topLevel.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            showCompany={showCompany}
            companyName={companies[task.company_id]}
            subtaskCount={subtaskCounts[task.id] ?? 0}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
