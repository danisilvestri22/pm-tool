'use client'
import TaskList from '@/components/tasks/TaskList'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  companies: Record<string, string>
}

export default function AllTasksView({ tasks, companies }: Props) {
  return (
    <div className="p-6 flex flex-col h-full">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">All Tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No open tasks across any company.</p>
      ) : (
        <div className="flex-1 overflow-hidden">
          <TaskList tasks={tasks} showCompany companies={companies} />
        </div>
      )}
    </div>
  )
}
