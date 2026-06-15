'use client'
import { useState, useEffect } from 'react'
import { X, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import TaskPanelField from './TaskPanelField'
import TaskForm from './TaskForm'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import SubtaskList from './SubtaskList'
import Toast from '@/components/ui/Toast'
import { updateTask, softDeleteTask, restoreTask, getKnownNames } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  task: Task | null
  subtasks?: Task[]
  onClose: () => void
}

export default function TaskPanel({ task, subtasks = [], onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [deletedTaskId, setDeletedTaskId] = useState<string | null>(null)
  const [deletedTaskName, setDeletedTaskName] = useState('')
  const [knownNames, setKnownNames] = useState<string[]>([])

  useEffect(() => {
    getKnownNames().then(setKnownNames)
  }, [])

  async function updateField(field: string, value: string) {
    if (!task) return
    const fd = new FormData()
    fd.set(field, value)
    await updateTask(task.id, fd)
  }

  if (!task) {
    return (
      <>
        {deletedTaskId && (
          <Toast
            message={`"${deletedTaskName}" deleted`}
            onUndo={async () => {
              await restoreTask(deletedTaskId)
              setDeletedTaskId(null)
            }}
            onDismiss={() => setDeletedTaskId(null)}
          />
        )}
      </>
    )
  }

  if (editing) {
    return (
      <aside className="fixed sm:relative inset-0 sm:inset-auto sm:w-80 bg-white border-l h-full overflow-y-auto shrink-0 flex flex-col z-30 sm:z-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900 text-sm">Edit task</h2>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <TaskForm
            companyId={task.company_id}
            task={task}
            knownNames={knownNames}
            onSubmit={async fd => {
              const result = await updateTask(task.id, fd)
              if (result?.success) setEditing(false)
              return result
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </aside>
    )
  }

  const inputClass = 'w-full text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-400 focus:outline-none py-0.5 transition-colors'

  return (
    <>
      <aside className="fixed sm:relative inset-0 sm:inset-auto sm:w-80 bg-white border-l h-full overflow-y-auto shrink-0 flex flex-col z-30 sm:z-auto">
        <div className="flex items-start justify-between p-4 border-b gap-2">
          <h2 className="font-semibold text-gray-900 flex-1 min-w-0 break-words">{task.name}</h2>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="Edit task"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <datalist id="panel-known-names">
          {knownNames.map(n => <option key={n} value={n} />)}
        </datalist>

        <dl className="p-4 space-y-4 flex-1">
          <TaskPanelField label="Status">
            <StatusBadge status={task.status} />
          </TaskPanelField>

          <TaskPanelField label="Priority">
            <PriorityBadge priority={task.priority} />
          </TaskPanelField>

          <TaskPanelField label="Responsible">
            <input
              list="panel-known-names"
              defaultValue={task.responsible ?? ''}
              onBlur={e => updateField('responsible', e.target.value)}
              placeholder="—"
              className={inputClass}
            />
          </TaskPanelField>

          <TaskPanelField label="Due date">
            <input
              type="date"
              defaultValue={task.due_date ?? ''}
              onChange={e => updateField('due_date', e.target.value)}
              className={inputClass}
            />
          </TaskPanelField>

          <TaskPanelField label="Reminder date">
            <input
              type="date"
              defaultValue={task.followup_date ?? ''}
              onChange={e => updateField('followup_date', e.target.value)}
              className={inputClass}
            />
            {task.followup_date && (
              <p className="text-xs text-emerald-500 mt-0.5">Push notification will fire on this date</p>
            )}
          </TaskPanelField>

          <TaskPanelField label="Waiting on">
            <input
              list="panel-known-names"
              defaultValue={task.waiting_on ?? ''}
              onBlur={e => updateField('waiting_on', e.target.value)}
              placeholder="—"
              className={inputClass}
            />
          </TaskPanelField>

          {task.notes && (
            <TaskPanelField label="Notes">
              <p className="whitespace-pre-wrap text-gray-700">{task.notes}</p>
            </TaskPanelField>
          )}

          <TaskPanelField label={`Subtasks${subtasks.length > 0 ? ` (${subtasks.length})` : ''}`}>
            <SubtaskList parentTask={task} subtasks={subtasks} />
          </TaskPanelField>
        </dl>

        <div className="p-4 border-t">
          <button
            onClick={async () => {
              const name = task.name
              const id = task.id
              onClose()
              await softDeleteTask(id)
              setDeletedTaskId(id)
              setDeletedTaskName(name)
            }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Delete task
          </button>
        </div>
      </aside>

      {deletedTaskId && (
        <Toast
          message={`"${deletedTaskName}" deleted`}
          onUndo={async () => {
            await restoreTask(deletedTaskId)
            setDeletedTaskId(null)
          }}
          onDismiss={() => setDeletedTaskId(null)}
        />
      )}
    </>
  )
}
