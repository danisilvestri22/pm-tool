'use client'
import { useState } from 'react'
import BoardCard from './BoardCard'
import TaskPanel from './TaskPanel'
import type { Task, BoardColumn } from '@/types/database'

const COLUMNS: { key: BoardColumn; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

export default function TaskBoard({ tasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const topLevel = tasks.filter(t => !t.parent_task_id)
  const subtaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})
  const subtasksFor = (id: string) => tasks.filter(t => t.parent_task_id === id)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = topLevel.filter(t => t.board_column === col.key)
          return (
            <div key={col.key} className="w-72 shrink-0 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">{col.label}</h3>
                <span className="text-xs text-gray-400">{colTasks.length}</span>
              </div>
              <div className="space-y-2 flex-1 min-h-[60px] bg-gray-50 rounded-xl p-2">
                {colTasks.map(task => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    subtaskCount={subtaskCounts[task.id] ?? 0}
                    onSelect={setSelectedTask}
                  />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-4">No tasks</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <TaskPanel
        task={selectedTask}
        subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}
