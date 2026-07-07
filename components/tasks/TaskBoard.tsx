'use client'
import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import BoardCard from './BoardCard'
import TaskPanel from './TaskPanel'
import { updateTask } from '@/app/(app)/actions/tasks'
import type { Task, Status } from '@/types/database'

const COLUMNS: { key: Status; label: string }[] = [
  { key: 'not_started',         label: 'Not Started' },
  { key: 'in_progress',         label: 'In Progress' },
  { key: 'waiting_on_response', label: 'Waiting on Response' },
  { key: 'blocked',             label: 'Blocked' },
  { key: 'at_risk',             label: 'Overdue / At Risk' },
  { key: 'done',                label: 'Done' },
]

function DroppableColumn({
  id,
  label,
  count,
  children,
}: {
  id: string
  label: string
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">{label}</h3>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 flex-1 min-h-[60px] rounded-xl p-2 transition-colors ${
          isOver ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-gray-50'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export default function TaskBoard({ tasks: propTasks }: { tasks: Task[] }) {
  const [localTasks, setLocalTasks] = useState(propTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => { setLocalTasks(propTasks) }, [propTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const topLevel = localTasks.filter(t => !t.parent_task_id)
  const subtaskCounts = localTasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})
  const subtasksFor = (id: string) => localTasks.filter(t => t.parent_task_id === id)

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as Status
    const task = localTasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    const oldStatus = task.status

    setLocalTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    const fd = new FormData()
    fd.set('status', newStatus)
    const result = await updateTask(taskId, fd)

    if (result?.error) {
      setLocalTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: oldStatus } : t))
      )
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden">
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colTasks = topLevel.filter(t => t.status === col.key)
            return (
              <DroppableColumn key={col.key} id={col.key} label={col.label} count={colTasks.length}>
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
              </DroppableColumn>
            )
          })}
        </div>

        <TaskPanel
          task={selectedTask}
          subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
          onClose={() => setSelectedTask(null)}
        />
      </div>
    </DndContext>
  )
}
