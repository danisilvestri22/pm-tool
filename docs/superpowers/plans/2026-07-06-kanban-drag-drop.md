# Kanban Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop to the board view so cards can be moved between 6 status columns, updating the task status in the DB on drop.

**Architecture:** Install @dnd-kit/core. TaskBoard wraps everything in DndContext with a PointerSensor (8px activation distance). Each column is a useDroppable zone keyed by status value. BoardCard uses useDraggable keyed by task id. onDragEnd optimistically updates local state then calls the existing updateTask server action; reverts on error.

**Tech Stack:** @dnd-kit/core 6.x, Next.js 16.2.6, React 19, TypeScript, Tailwind v4

---

## File Structure

- **Modify:** `components/tasks/TaskBoard.tsx` — Add DndContext, DroppableColumn helper, optimistic state, onDragEnd handler. Change columns from BoardColumn to Status.
- **Modify:** `components/tasks/BoardCard.tsx` — Add useDraggable, drag cursor styles, opacity while dragging.

No new files. No DB changes.

---

### Task 1: Install @dnd-kit and update TaskBoard.tsx

**Files:**
- Modify: `components/tasks/TaskBoard.tsx`

- [ ] **Step 1: Install @dnd-kit/core**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npm install @dnd-kit/core
```

Expected: package installs with no errors (peer dep warnings about React 19 are harmless — ignore them).

- [ ] **Step 2: Verify the install**

```bash
ls node_modules/@dnd-kit/core/dist/index.js
```

Expected: file exists.

- [ ] **Step 3: Replace TaskBoard.tsx with the full updated implementation**

Replace the entire contents of `components/tasks/TaskBoard.tsx` with:

```tsx
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
```

- [ ] **Step 4: Type-check**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskBoard.tsx package.json package-lock.json
git commit -m "feat: add drag-and-drop board with 6 status columns"
```

---

### Task 2: Update BoardCard.tsx with useDraggable

**Files:**
- Modify: `components/tasks/BoardCard.tsx`

- [ ] **Step 1: Replace BoardCard.tsx with the full updated implementation**

Replace the entire contents of `components/tasks/BoardCard.tsx` with:

```tsx
'use client'
import { useDraggable } from '@dnd-kit/core'
import { format } from 'date-fns'
import StatusBadge from './StatusBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  subtaskCount?: number
  onSelect: (task: Task) => void
}

export default function BoardCard({ task, subtaskCount = 0, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const isOverdue =
    task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task)}
      className={`w-full text-left bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{task.name}</p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={task.status} />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {subtaskCount > 0 && <span>{subtaskCount} subtasks</span>}
          {task.due_date && (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.responsible && (
            <span className="truncate max-w-[80px]">{task.responsible}</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

1. Run `npm run dev` and open `http://localhost:3000`
2. Navigate to any company page → switch to Board view
3. Confirm 6 columns appear: Not Started / In Progress / Waiting on Response / Blocked / Overdue-At Risk / Done
4. Hover a card — cursor should show `grab`
5. Drag a card to a different column — it should move and the column should highlight emerald while hovering
6. Release — card stays in new column, status should match in list view
7. Short-tap a card — TaskPanel should open normally (not drag)
8. Drag a card to the same column it's already in — nothing should change

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/BoardCard.tsx
git commit -m "feat: make board cards draggable with useDraggable"
```
