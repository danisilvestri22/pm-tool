'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import TaskRow from './TaskRow'
import TaskPanel from './TaskPanel'
import FilterBar, { type Filters, defaultFilters } from './FilterBar'
import type { Task } from '@/types/database'

const priorityOrder = { high: 0, medium: 1, low: 2 }
const statusOrder: Record<string, number> = { at_risk: 0, blocked: 1, waiting_on_response: 2, in_progress: 3, not_started: 4, done: 5 }

const STATUS_GROUPS: { key: string; label: string; color: string }[] = [
  { key: 'at_risk',              label: 'At Risk',               color: 'text-red-500' },
  { key: 'blocked',              label: 'Blocked',               color: 'text-red-700' },
  { key: 'waiting_on_response',  label: 'Waiting on Response',   color: 'text-amber-500' },
  { key: 'in_progress',          label: 'In Progress',           color: 'text-blue-500' },
  { key: 'not_started',          label: 'Not Started',           color: 'text-gray-500' },
]

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
  search?: string
  showReminder?: boolean
  pinnedTaskIds?: string[]
}

export default function TaskList({ tasks, showCompany, companies = {}, people = [], search = '', showReminder = false, pinnedTaskIds = [] }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  function isSectionOpen(key: string) { return openSections[key] !== false }
  function toggleSection(key: string) { setOpenSections(prev => ({ ...prev, [key]: !isSectionOpen(key) })) }

  const subtasksFor = (id: string) => tasks.filter(t => t.parent_task_id === id)
  const topLevel = tasks.filter(t => !t.parent_task_id)

  function matchesBase(t: Task): boolean {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.responsible?.toLowerCase().includes(q) ?? false) ||
      (t.notes?.toLowerCase().includes(q) ?? false) ||
      (t.waiting_on?.toLowerCase().includes(q) ?? false)
    const matchResponsible =
      !filters.responsible ||
      t.responsible === filters.responsible ||
      t.waiting_on === filters.responsible
    const matchCompany = !filters.company || t.company_id === filters.company
    return matchSearch && matchResponsible && matchCompany
  }

  const filtered = topLevel
    .filter(t => {
      if (t.status === 'done') return false
      const matchStatus = filters.statuses.length === 0 || filters.statuses.includes(t.status)
      const matchPriority = !filters.priority || t.priority === filters.priority
      return matchesBase(t) && matchStatus && matchPriority
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

  const completed = topLevel
    .filter(t => t.status === 'done' && matchesBase(t))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Priority', 'Status', 'Due date', ...(showReminder ? ['Reminder'] : []), 'Waiting on', 'Notes']
    : ['Task', 'Responsible', 'Priority', 'Status', 'Due date', ...(showReminder ? ['Reminder'] : []), 'Waiting on', 'Notes']

  const gridTemplate = showCompany
    ? (showReminder ? 'minmax(300px,4fr) 120px 120px 55px 100px 100px 100px 100px 140px' : 'minmax(300px,4fr) 120px 120px 55px 100px 100px 100px 140px')
    : (showReminder ? 'minmax(300px,4fr) 120px 55px 100px 100px 100px 100px 140px' : 'minmax(300px,4fr) 120px 55px 100px 100px 100px 140px')

  const hasActive = filtered.length > 0
  const hasCompleted = completed.length > 0
  const hasAny = hasActive || hasCompleted

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FilterBar filters={filters} onChange={setFilters} companies={showCompany ? companies : undefined} people={people} />

      {!hasAny ? (
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
            {/* Column headers */}
            <div
              className="hidden sm:grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map(col => (
                <span key={col}>{col}</span>
              ))}
            </div>

            {/* Active tasks — grouped by status */}
            {STATUS_GROUPS.map(group => {
              const groupTasks = filtered.filter(t => t.status === group.key)
              if (groupTasks.length === 0) return null
              const isOpen = isSectionOpen(group.key)
              return (
                <div key={group.key} className="border-t">
                  <button
                    onClick={() => toggleSection(group.key)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
                    <span className={`text-xs font-semibold uppercase tracking-wide ${group.color}`}>
                      {group.label}
                    </span>
                    <span className="text-xs text-gray-400">{groupTasks.length}</span>
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-gray-50">
                      {groupTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          showCompany={showCompany}
                          companyName={companies[task.company_id]}
                          subtasks={subtasksFor(task.id)}
                          people={people}
                          showReminder={showReminder}
                          pinnedTaskIds={pinnedTaskIds}
                          onSelect={setSelectedTask}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Completed section */}
            {hasCompleted && (
              <div className="mt-2 border-t">
                <button
                  onClick={() => setCompletedOpen(o => !o)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  {completedOpen
                    ? <ChevronDown size={13} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Completed
                  </span>
                  <span className="text-xs text-gray-400">{completed.length}</span>
                </button>
                {completedOpen && (
                  <div className="divide-y divide-gray-50 opacity-70">
                    {completed.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        showCompany={showCompany}
                        companyName={companies[task.company_id]}
                        subtasks={subtasksFor(task.id)}
                        people={people}
                        showReminder={showReminder}
                        pinnedTaskIds={pinnedTaskIds}
                        onSelect={setSelectedTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <TaskPanel
            task={selectedTask}
            subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
            people={people}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}
    </div>
  )
}
