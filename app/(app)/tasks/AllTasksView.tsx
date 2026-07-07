'use client'
import { useState } from 'react'
import TaskList from '@/components/tasks/TaskList'
import TaskBoard from '@/components/tasks/TaskBoard'
import ViewToggle from '@/components/tasks/ViewToggle'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  companies: Record<string, string>
  people: string[]
  showReminder?: boolean
  pinnedTaskIds?: string[]
}

export default function AllTasksView({ tasks, companies, people, showReminder, pinnedTaskIds = [] }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')
  const [search, setSearch] = useState('')

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">All Tasks</h1>
        <div className="flex items-center gap-2">
          {view === 'list' && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-48"
            />
          )}
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No open tasks across any company.</p>
      ) : (
        <div className="flex-1 overflow-hidden">
          {view === 'list' ? (
            <TaskList tasks={tasks} showCompany companies={companies} people={people} search={search} showReminder={showReminder} pinnedTaskIds={pinnedTaskIds} />
          ) : (
            <TaskBoard tasks={tasks} people={people} />
          )}
        </div>
      )}
    </div>
  )
}
