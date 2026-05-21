'use client'
import { useState } from 'react'
import TaskList from '@/components/tasks/TaskList'
import TaskBoard from '@/components/tasks/TaskBoard'
import ViewToggle from '@/components/tasks/ViewToggle'
import AddTaskButton from '@/components/tasks/AddTaskButton'
import type { Task } from '@/types/database'

interface Company {
  id: string
  name: string
}

interface Props {
  company: Company
  tasks: Task[]
}

export default function CompanyView({ company, tasks }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <AddTaskButton companyId={company.id} />
      <div className="flex-1 overflow-hidden">
        {view === 'list' ? (
          <TaskList tasks={tasks} />
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </div>
    </div>
  )
}
