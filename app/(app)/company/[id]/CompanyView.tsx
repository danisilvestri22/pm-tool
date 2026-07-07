'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import TaskList from '@/components/tasks/TaskList'
import TaskBoard from '@/components/tasks/TaskBoard'
import ViewToggle from '@/components/tasks/ViewToggle'
import AddTaskButton from '@/components/tasks/AddTaskButton'
import { renameCompany } from '@/app/(app)/actions/companies'
import type { Task } from '@/types/database'

interface Company {
  id: string
  name: string
}

interface Props {
  company: Company
  tasks: Task[]
  people: string[]
  showReminder?: boolean
}

export default function CompanyView({ company, tasks, people, showReminder }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')
  const [search, setSearch] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(company.name)

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={async () => {
              setEditingName(false)
              if (nameVal.trim() && nameVal !== company.name) {
                await renameCompany(company.id, nameVal.trim())
              } else {
                setNameVal(company.name)
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { setNameVal(company.name); setEditingName(false) }
            }}
            className="text-xl font-semibold text-gray-900 border-b border-emerald-400 focus:outline-none bg-transparent"
          />
        ) : (
          <h1
            className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-emerald-600 transition-colors"
            title="Click to rename"
            onClick={() => setEditingName(true)}
          >
            {nameVal}
          </h1>
        )}
        <div className="flex items-center gap-2">
          {view === 'list' && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-48"
            />
          )}
          <a
            href={`/api/export/${company.id}`}
            download
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </a>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>
      <AddTaskButton companyId={company.id} people={people} />
      <div className="flex-1 overflow-hidden">
        {view === 'list' ? (
          <TaskList tasks={tasks} people={people} search={search} showReminder={showReminder} />
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </div>
    </div>
  )
}
