'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import TaskForm from './TaskForm'
import { createTask } from '@/app/(app)/actions/tasks'

interface Props {
  companyId: string
  people?: string[]
}

export default function AddTaskButton({ companyId, people = [] }: Props) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <div className="bg-white border rounded-xl p-4 mb-4">
        <h3 className="font-medium text-sm mb-3">New task</h3>
        <TaskForm
          companyId={companyId}
          knownNames={people}
          onSubmit={async fd => {
            const result = await createTask(fd)
            if (result?.success) setOpen(false)
            return result
          }}
          onCancel={() => setOpen(false)}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 mb-4"
    >
      <Plus size={14} />
      Add task
    </button>
  )
}
