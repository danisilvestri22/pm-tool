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
}

export default function AllTasksView({ tasks, companies, people }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">All Tasks</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No open tasks across any company.</p>
      ) : (
        <div className="flex-1 overflow-hidden">
          {view === 'list' ? (
            <TaskList tasks={tasks} showCompany companies={companies} people={people} />
          ) : (
            <TaskBoard tasks={tasks} />
          )}
        </div>
      )}
    </div>
  )
}
