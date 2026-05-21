'use client'
import TaskList from '@/components/tasks/TaskList'
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
  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
      </div>
      <div className="flex-1 overflow-auto">
        <TaskList tasks={tasks} />
      </div>
    </div>
  )
}
