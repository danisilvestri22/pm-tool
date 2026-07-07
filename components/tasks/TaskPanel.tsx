'use client'
import { useState, useEffect } from 'react'
import { X, Pencil, Trash2, Check } from 'lucide-react'
import { format } from 'date-fns'
import TaskPanelField from './TaskPanelField'
import TaskForm from './TaskForm'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import SubtaskList from './SubtaskList'
import Toast from '@/components/ui/Toast'
import { updateTask, softDeleteTask, restoreTask, getComments, addComment, updateComment, deleteComment, type TaskComment } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  task: Task | null
  subtasks?: Task[]
  people?: string[]
  onClose: () => void
}

function CommentsSection({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    setComments([])
    getComments(taskId).then(setComments)
  }, [taskId])

  async function handleAdd() {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    const c = await addComment(taskId, commentText.trim())
    if (c) { setComments(prev => [...prev, c]); setCommentText('') }
    setSubmitting(false)
  }

  async function handleUpdate(id: string) {
    if (!editText.trim()) return
    await updateComment(id, editText.trim())
    setComments(prev => prev.map(c => c.id === id ? { ...c, body: editText.trim() } : c))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this comment?')) return
    await deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-3 mt-1">
      {comments.map(c => (
        <div key={c.id} className="group text-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-gray-400">
              {c.author_name} · {format(new Date(c.created_at), 'MMM d, h:mm a')}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingId(c.id); setEditText(c.body) }}
                className="text-gray-300 hover:text-gray-500"
                title="Edit"
              >
                <Pencil size={10} />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-gray-300 hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
          {editingId === c.id ? (
            <div className="mt-1 flex gap-1">
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate(c.id) }
                  if (e.key === 'Escape') setEditingId(null)
                }}
                rows={2}
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
              />
              <button
                onClick={() => handleUpdate(c.id)}
                className="self-end text-emerald-600 hover:text-emerald-700"
                title="Save"
              >
                <Check size={13} />
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-gray-700 whitespace-pre-wrap">{c.body}</p>
          )}
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
          }}
          placeholder="Add a comment… (Enter to save, Shift+Enter for new line)"
          rows={2}
          className="flex-1 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !commentText.trim()}
          className="self-end text-xs bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default function TaskPanel({ task, subtasks = [], people = [], onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [deletedTaskId, setDeletedTaskId] = useState<string | null>(null)
  const [deletedTaskName, setDeletedTaskName] = useState('')

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
            knownNames={people}
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
          {people.map(n => <option key={n} value={n} />)}
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

          <div className="border-t pt-4">
            <TaskPanelField label={`Subtasks${subtasks.length > 0 ? ` (${subtasks.length})` : ''}`}>
              <SubtaskList parentTask={task} subtasks={subtasks} />
            </TaskPanelField>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 -mx-1">
            <TaskPanelField label="Comments">
              <CommentsSection taskId={task.id} />
            </TaskPanelField>
          </div>
        </dl>

        <div className="p-4 border-t">
          <button
            onClick={async () => {
              if (!window.confirm(`Delete "${task.name}"?`)) return
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
