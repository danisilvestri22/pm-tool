'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import TaskPanel from './TaskPanel'
import FilterBar, { type Filters, defaultFilters } from './FilterBar'
import type { Task } from '@/types/database'

const priorityOrder = { high: 0, medium: 1, low: 2 }
const statusOrder = { at_risk: 0, on_track: 1, completed: 2 }

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
}

export default function TaskList({ tasks, showCompany, companies = {} }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const subtaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})
  const subtasksFor = (id: string) => tasks.filter(t => t.parent_task_id === id)
  const topLevel = tasks.filter(t => !t.parent_task_id)

  const filtered = topLevel
    .filter(t => {
      const q = filters.search.toLowerCase()
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.responsible?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.waiting_on?.toLowerCase().includes(q)
      const matchStatus = !filters.status || t.status === filters.status
      const matchPriority = !filters.priority || t.priority === filters.priority
      const matchResponsible =
        !filters.responsible ||
        t.responsible?.toLowerCase().includes(filters.responsible.toLowerCase())
      return matchSearch && matchStatus && matchPriority && matchResponsible
    })
    .sort((a, b) => {
      if (filters.sortBy === 'due_date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      if (filters.sortBy === 'priority')
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      if (filters.sortBy === 'status')
        return statusOrder[a.status] - statusOrder[b.status]
      return b.created_at.localeCompare(a.created_at)
    })

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FilterBar filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {topLevel.length === 0 ? (
            <>
              <p className="text-sm">No tasks yet.</p>
              <p className="text-sm mt-1">Add your first task using the button above.</p>
            </>
          ) : (
            <p className="text-sm">No tasks match your filters.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div
              className="hidden sm:grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{
                gridTemplateColumns: showCompany
                  ? '2fr 1fr 1fr 90px 80px 80px 90px'
                  : '2fr 1fr 90px 80px 80px 90px',
              }}
            >
              {columns.map(col => (
                <span key={col}>{col}</span>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  onSelect={setSelectedTask}
                />
              ))}
            </div>
          </div>

          <TaskPanel
            task={selectedTask}
            subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}
    </div>
  )
}
