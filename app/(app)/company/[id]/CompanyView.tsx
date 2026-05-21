'use client'
import TaskList from '@/components/tasks/TaskList'
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
  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
      </div>
      <AddTaskButton companyId={company.id} />
      <div className="flex-1 overflow-hidden">
        <TaskList tasks={tasks} />
      </div>
    </div>
  )
}
