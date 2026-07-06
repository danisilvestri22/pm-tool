# Search, Filters, and Notes Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the search input into page headers, add a company filter dropdown to the filter bar on All Tasks, and add an inline-editable notes column to the task list on company pages.

**Architecture:** FilterBar and filtering logic already live in TaskList and are already wired into both All Tasks and company pages. This plan makes three isolated changes: (1) remove search from FilterBar, lift it to AllTasksView and CompanyView headers; (2) add a company dropdown to FilterBar (only visible on All Tasks); (3) add a notes column to TaskList and TaskRow on company pages with click-to-edit inline. No DB migration needed — `notes` column already exists.

**Tech Stack:** Next.js 16.2.6 App Router, React 19, Tailwind v4, TypeScript. Verify each task with `npm run build`. No test suite — use build success + manual browser check as acceptance.

---

## File map

| File | Task(s) | What changes |
|---|---|---|
| `components/tasks/FilterBar.tsx` | 1, 2 | Remove search input/type; add company prop + dropdown |
| `components/tasks/TaskList.tsx` | 1, 2, 3 | Accept `search` prop; add company filter; add Notes column header |
| `app/(app)/tasks/AllTasksView.tsx` | 1 | Add search state + input to header; pass to TaskList |
| `app/(app)/company/[id]/CompanyView.tsx` | 1 | Add search state + input to header; pass to TaskList |
| `components/tasks/TaskRow.tsx` | 3 | Add notes column cell with truncate + inline edit |

---

## Task 1: Move search to page headers

**Files:**
- Modify: `components/tasks/FilterBar.tsx`
- Modify: `components/tasks/TaskList.tsx`
- Modify: `app/(app)/tasks/AllTasksView.tsx`
- Modify: `app/(app)/company/[id]/CompanyView.tsx`

- [ ] **Step 1: Replace FilterBar.tsx — remove search field**

Replace the entire contents of `components/tasks/FilterBar.tsx` with:

```tsx
'use client'
import type { Status, Priority } from '@/types/database'

export interface Filters {
  status: Status | ''
  priority: Priority | ''
  responsible: string
  sortBy: 'due_date' | 'priority' | 'status' | 'created_at'
}

export const defaultFilters: Filters = {
  status: '',
  priority: '',
  responsible: '',
  sortBy: 'due_date',
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FilterBar({ filters, onChange }: Props) {
  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value })

  const inputClass =
    'border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select value={filters.status} onChange={set('status')} className={inputClass}>
        <option value="">All statuses</option>
        <option value="on_track">On track</option>
        <option value="at_risk">At risk</option>
        <option value="completed">Completed</option>
      </select>
      <select value={filters.priority} onChange={set('priority')} className={inputClass}>
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <input
        value={filters.responsible}
        onChange={set('responsible')}
        placeholder="Filter by person…"
        className={`${inputClass} w-36`}
      />
      <select value={filters.sortBy} onChange={set('sortBy')} className={inputClass}>
        <option value="due_date">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
        <option value="status">Sort: Status</option>
        <option value="created_at">Sort: Newest</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Replace TaskList.tsx — accept search prop, use it in filter logic**

Replace the entire contents of `components/tasks/TaskList.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import TaskPanel from './TaskPanel'
import FilterBar, { type Filters, defaultFilters } from './FilterBar'
import type { Task } from '@/types/database'

const priorityOrder = { high: 0, medium: 1, low: 2 }
const statusOrder = { at_risk: 0, on_track: 1, completed: 2 }

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
  search?: string
}

export default function TaskList({ tasks, showCompany, companies = {}, people = [], search = '' }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const subtaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})
  const subtasksFor = (id: string) => tasks.filter(t => t.parent_task_id === id)
  const topLevel = tasks.filter(t => !t.parent_task_id)

  const filtered = topLevel
    .filter(t => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.responsible?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.waiting_on?.toLowerCase().includes(q)
      const matchStatus = !filters.status || t.status === filters.status
      const matchPriority = !filters.priority || t.priority === filters.priority
      const matchResponsible =
        !filters.responsible ||
        t.responsible?.toLowerCase().includes(filters.responsible.toLowerCase())
      return matchSearch && matchStatus && matchPriority && matchResponsible
    })
    .sort((a, b) => {
      if (filters.sortBy === 'due_date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      if (filters.sortBy === 'priority')
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      if (filters.sortBy === 'status')
        return statusOrder[a.status] - statusOrder[b.status]
      return b.created_at.localeCompare(a.created_at)
    })

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FilterBar filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {topLevel.length === 0 ? (
            <>
              <p className="text-sm">No tasks yet.</p>
              <p className="text-sm mt-1">Add your first task using the button above.</p>
            </>
          ) : (
            <p className="text-sm">No tasks match your filters.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div
              className="hidden sm:grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{
                gridTemplateColumns: showCompany
                  ? '2fr 1fr 1fr 110px 120px 120px 120px'
                  : '2fr 1fr 110px 120px 120px 120px',
              }}
            >
              {columns.map(col => (
                <span key={col}>{col}</span>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  people={people}
                  onSelect={setSelectedTask}
                />
              ))}
            </div>
          </div>

          <TaskPanel
            task={selectedTask}
            subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
            people={people}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Replace AllTasksView.tsx — add search state and input to header**

Replace the entire contents of `app/(app)/tasks/AllTasksView.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import TaskList from '@/components/tasks/TaskList'
import TaskBoard from '@/components/tasks/TaskBoard'
import ViewToggle from '@/components/tasks/ViewToggle'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  companies: Record<string, string>
  people: string[]
}

export default function AllTasksView({ tasks, companies, people }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')
  const [search, setSearch] = useState('')

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">All Tasks</h1>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-48"
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No open tasks across any company.</p>
      ) : (
        <div className="flex-1 overflow-hidden">
          {view === 'list' ? (
            <TaskList tasks={tasks} showCompany companies={companies} people={people} search={search} />
          ) : (
            <TaskBoard tasks={tasks} />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Replace CompanyView.tsx — add search state and input to header**

Replace the entire contents of `app/(app)/company/[id]/CompanyView.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import TaskList from '@/components/tasks/TaskList'
import TaskBoard from '@/components/tasks/TaskBoard'
import ViewToggle from '@/components/tasks/ViewToggle'
import AddTaskButton from '@/components/tasks/AddTaskButton'
import type { Task } from '@/types/database'

interface Company {
  id: string
  name: string
}

interface Props {
  company: Company
  tasks: Task[]
  people: string[]
}

export default function CompanyView({ company, tasks, people }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')
  const [search, setSearch] = useState('')

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-48"
          />
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
          <TaskList tasks={tasks} people={people} search={search} />
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no type errors. If you see errors referencing `filters.search` or `search` prop mismatches, fix them before continuing.

- [ ] **Step 6: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/FilterBar.tsx components/tasks/TaskList.tsx app/\(app\)/tasks/AllTasksView.tsx app/\(app\)/company/\[id\]/CompanyView.tsx
git commit -m "feat: move search input to page headers

Search is now in the header row of All Tasks and company pages,
alongside the title and list/board toggle. Removed from FilterBar.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add company filter to FilterBar

**Files:**
- Modify: `components/tasks/FilterBar.tsx`
- Modify: `components/tasks/TaskList.tsx`

- [ ] **Step 1: Replace FilterBar.tsx — add company to Filters type and add dropdown**

Replace the entire contents of `components/tasks/FilterBar.tsx` with:

```tsx
'use client'
import type { Status, Priority } from '@/types/database'

export interface Filters {
  status: Status | ''
  priority: Priority | ''
  responsible: string
  company: string
  sortBy: 'due_date' | 'priority' | 'status' | 'created_at'
}

export const defaultFilters: Filters = {
  status: '',
  priority: '',
  responsible: '',
  company: '',
  sortBy: 'due_date',
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  companies?: Record<string, string>
}

export default function FilterBar({ filters, onChange, companies }: Props) {
  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value })

  const inputClass =
    'border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {companies && Object.keys(companies).length > 0 && (
        <select value={filters.company} onChange={set('company')} className={inputClass}>
          <option value="">All companies</option>
          {Object.entries(companies).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      )}
      <select value={filters.status} onChange={set('status')} className={inputClass}>
        <option value="">All statuses</option>
        <option value="on_track">On track</option>
        <option value="at_risk">At risk</option>
        <option value="completed">Completed</option>
      </select>
      <select value={filters.priority} onChange={set('priority')} className={inputClass}>
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <input
        value={filters.responsible}
        onChange={set('responsible')}
        placeholder="Filter by person…"
        className={`${inputClass} w-36`}
      />
      <select value={filters.sortBy} onChange={set('sortBy')} className={inputClass}>
        <option value="due_date">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
        <option value="status">Sort: Status</option>
        <option value="created_at">Sort: Newest</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Replace TaskList.tsx — pass companies to FilterBar, add company match**

Replace the entire contents of `components/tasks/TaskList.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import TaskPanel from './TaskPanel'
import FilterBar, { type Filters, defaultFilters } from './FilterBar'
import type { Task } from '@/types/database'

const priorityOrder = { high: 0, medium: 1, low: 2 }
const statusOrder = { at_risk: 0, on_track: 1, completed: 2 }

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
  search?: string
}

export default function TaskList({ tasks, showCompany, companies = {}, people = [], search = '' }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const subtaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})
  const subtasksFor = (id: string) => tasks.filter(t => t.parent_task_id === id)
  const topLevel = tasks.filter(t => !t.parent_task_id)

  const filtered = topLevel
    .filter(t => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.responsible?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.waiting_on?.toLowerCase().includes(q)
      const matchStatus = !filters.status || t.status === filters.status
      const matchPriority = !filters.priority || t.priority === filters.priority
      const matchResponsible =
        !filters.responsible ||
        t.responsible?.toLowerCase().includes(filters.responsible.toLowerCase())
      const matchCompany = !filters.company || t.company_id === filters.company
      return matchSearch && matchStatus && matchPriority && matchResponsible && matchCompany
    })
    .sort((a, b) => {
      if (filters.sortBy === 'due_date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      if (filters.sortBy === 'priority')
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      if (filters.sortBy === 'status')
        return statusOrder[a.status] - statusOrder[b.status]
      return b.created_at.localeCompare(a.created_at)
    })

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FilterBar filters={filters} onChange={setFilters} companies={showCompany ? companies : undefined} />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {topLevel.length === 0 ? (
            <>
              <p className="text-sm">No tasks yet.</p>
              <p className="text-sm mt-1">Add your first task using the button above.</p>
            </>
          ) : (
            <p className="text-sm">No tasks match your filters.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div
              className="hidden sm:grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{
                gridTemplateColumns: showCompany
                  ? '2fr 1fr 1fr 110px 120px 120px 120px'
                  : '2fr 1fr 110px 120px 120px 120px',
              }}
            >
              {columns.map(col => (
                <span key={col}>{col}</span>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  people={people}
                  onSelect={setSelectedTask}
                />
              ))}
            </div>
          </div>

          <TaskPanel
            task={selectedTask}
            subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
            people={people}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}
    </div>
  )
}
```

Note: `companies={showCompany ? companies : undefined}` ensures the company dropdown only appears on All Tasks (where `showCompany` is true), not on individual company pages.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/FilterBar.tsx components/tasks/TaskList.tsx
git commit -m "feat: add company filter dropdown to All Tasks filter bar

Company dropdown appears in the filter bar on All Tasks only.
Selecting a company narrows the list to that company's tasks.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Notes column in task list

**Files:**
- Modify: `components/tasks/TaskList.tsx`
- Modify: `components/tasks/TaskRow.tsx`

- [ ] **Step 1: Replace TaskList.tsx — add Notes column header and wider grid**

Replace the entire contents of `components/tasks/TaskList.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import TaskPanel from './TaskPanel'
import FilterBar, { type Filters, defaultFilters } from './FilterBar'
import type { Task } from '@/types/database'

const priorityOrder = { high: 0, medium: 1, low: 2 }
const statusOrder = { at_risk: 0, on_track: 1, completed: 2 }

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
  search?: string
}

export default function TaskList({ tasks, showCompany, companies = {}, people = [], search = '' }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const subtaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.parent_task_id) acc[t.parent_task_id] = (acc[t.parent_task_id] ?? 0) + 1
    return acc
  }, {})
  const subtasksFor = (id: string) => tasks.filter(t => t.parent_task_id === id)
  const topLevel = tasks.filter(t => !t.parent_task_id)

  const filtered = topLevel
    .filter(t => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.responsible?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.waiting_on?.toLowerCase().includes(q)
      const matchStatus = !filters.status || t.status === filters.status
      const matchPriority = !filters.priority || t.priority === filters.priority
      const matchResponsible =
        !filters.responsible ||
        t.responsible?.toLowerCase().includes(filters.responsible.toLowerCase())
      const matchCompany = !filters.company || t.company_id === filters.company
      return matchSearch && matchStatus && matchPriority && matchResponsible && matchCompany
    })
    .sort((a, b) => {
      if (filters.sortBy === 'due_date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      if (filters.sortBy === 'priority')
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      if (filters.sortBy === 'status')
        return statusOrder[a.status] - statusOrder[b.status]
      return b.created_at.localeCompare(a.created_at)
    })

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on', 'Notes']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on', 'Notes']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FilterBar filters={filters} onChange={setFilters} companies={showCompany ? companies : undefined} />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {topLevel.length === 0 ? (
            <>
              <p className="text-sm">No tasks yet.</p>
              <p className="text-sm mt-1">Add your first task using the button above.</p>
            </>
          ) : (
            <p className="text-sm">No tasks match your filters.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div
              className="hidden sm:grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{
                gridTemplateColumns: showCompany
                  ? '2fr 1fr 1fr 110px 120px 120px 120px 200px'
                  : '2fr 1fr 110px 120px 120px 120px 200px',
              }}
            >
              {columns.map(col => (
                <span key={col}>{col}</span>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  people={people}
                  onSelect={setSelectedTask}
                />
              ))}
            </div>
          </div>

          <TaskPanel
            task={selectedTask}
            subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
            people={people}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace TaskRow.tsx — add notes column cell with inline edit**

Replace the entire contents of `components/tasks/TaskRow.tsx` with:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  people?: string[]
  onSelect: (task: Task) => void
}

export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, people = [], onSelect }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(task.name)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState(task.notes ?? '')
  const [vals, setVals] = useState({
    responsible: task.responsible ?? '',
    status: task.status,
    due_date: task.due_date ?? '',
    followup_date: task.followup_date ?? '',
    waiting_on: task.waiting_on ?? '',
  })

  useEffect(() => {
    setNameVal(task.name)
    setNotesVal(task.notes ?? '')
    setVals({
      responsible: task.responsible ?? '',
      status: task.status,
      due_date: task.due_date ?? '',
      followup_date: task.followup_date ?? '',
      waiting_on: task.waiting_on ?? '',
    })
  }, [task])

  async function save(field: string, value: string) {
    const fd = new FormData()
    fd.set(field, value)
    await updateTask(task.id, fd)
  }

  const isOverdue = vals.due_date && vals.status !== 'completed' && new Date(vals.due_date) < new Date()

  const selectClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer max-w-full'
  const dateClass = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 hover:border-gray-200 hover:bg-white focus:outline-none focus:border-emerald-400 cursor-pointer w-[120px]'

  const statusColor =
    vals.status === 'completed' ? 'text-green-700' :
    vals.status === 'at_risk' ? 'text-red-600' :
    'text-blue-700'

  return (
    <div className={`w-full border-l-2 transition-colors ${
      vals.status === 'at_risk' ? 'border-red-400 bg-red-50/30' : 'border-transparent hover:bg-gray-50/50'
    }`}>
      {/* Mobile layout — tap row to open panel */}
      <div className="flex items-center gap-3 px-4 py-3 sm:hidden" onClick={() => onSelect(task)}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">
            {task.name}
            {subtaskCount > 0 && <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtaskCount})</span>}
          </p>
          {(task.responsible || showCompany) && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {showCompany && companyName ? `${companyName} · ` : ''}
              {task.responsible ?? ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            vals.status === 'completed' ? 'bg-green-100 text-green-700' :
            vals.status === 'at_risk' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {vals.status === 'on_track' ? 'On track' : vals.status === 'at_risk' ? 'At risk' : 'Done'}
          </span>
          {vals.due_date && (
            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {format(new Date(vals.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div
        className="hidden sm:grid items-center gap-3 px-4 py-2 text-sm"
        style={{
          gridTemplateColumns: showCompany
            ? '2fr 1fr 1fr 110px 120px 120px 120px 200px'
            : '2fr 1fr 110px 120px 120px 120px 200px',
        }}
      >
        {/* Task name — click to edit, double-click to open panel */}
        <div className="flex items-center gap-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={async () => {
                setEditingName(false)
                if (nameVal.trim() && nameVal !== task.name) {
                  const fd = new FormData()
                  fd.set('name', nameVal.trim())
                  await updateTask(task.id, fd)
                } else {
                  setNameVal(task.name)
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') { setNameVal(task.name); setEditingName(false) }
              }}
              className="font-medium text-gray-900 text-sm w-full border-b border-emerald-400 focus:outline-none bg-transparent py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              onDoubleClick={() => onSelect(task)}
              className="font-medium text-gray-900 text-left hover:text-emerald-600 transition-colors py-1 text-sm"
              title="Click to edit · Double-click to open"
            >
              {nameVal}
              {subtaskCount > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">({subtaskCount})</span>
              )}
            </button>
          )}
        </div>

        {showCompany && (
          <span className="text-gray-500 truncate text-xs">{companyName ?? '—'}</span>
        )}

        {/* Responsible */}
        <select
          value={vals.responsible}
          onChange={e => {
            setVals(v => ({ ...v, responsible: e.target.value }))
            save('responsible', e.target.value)
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {people.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Status */}
        <select
          value={vals.status}
          onChange={e => {
            const v = e.target.value as Task['status']
            setVals(s => ({ ...s, status: v }))
            save('status', v)
          }}
          className={`${selectClass} font-medium ${statusColor}`}
        >
          <option value="on_track">On track</option>
          <option value="at_risk">At risk</option>
          <option value="completed">Completed</option>
        </select>

        {/* Due date */}
        <input
          type="date"
          value={vals.due_date}
          onChange={e => {
            setVals(v => ({ ...v, due_date: e.target.value }))
            save('due_date', e.target.value)
          }}
          className={`${dateClass} ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}
        />

        {/* Reminder date */}
        <input
          type="date"
          value={vals.followup_date}
          onChange={e => {
            setVals(v => ({ ...v, followup_date: e.target.value }))
            save('followup_date', e.target.value)
          }}
          className={`${dateClass} text-emerald-500`}
        />

        {/* Waiting on */}
        <select
          value={vals.waiting_on}
          onChange={e => {
            setVals(v => ({ ...v, waiting_on: e.target.value }))
            save('waiting_on', e.target.value)
          }}
          className={selectClass}
        >
          <option value="">—</option>
          {people.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Notes — click to edit inline */}
        {editingNotes ? (
          <textarea
            autoFocus
            value={notesVal}
            onChange={e => setNotesVal(e.target.value)}
            onBlur={async () => {
              setEditingNotes(false)
              save('notes', notesVal)
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setNotesVal(task.notes ?? '')
                setEditingNotes(false)
              }
            }}
            rows={3}
            className="text-xs border border-emerald-400 rounded px-1.5 py-1 w-full focus:outline-none resize-none"
          />
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="text-xs text-gray-500 truncate block w-full text-left hover:text-gray-800 transition-colors"
            title={notesVal || undefined}
          >
            {notesVal || <span className="text-gray-300">—</span>}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskList.tsx components/tasks/TaskRow.tsx
git commit -m "feat: add inline-editable notes column to task list

Notes column appears on all task list pages. Truncated by default;
click to edit inline with a textarea, saves on blur.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage:**
- ✅ Search in page header on All Tasks (Task 1, AllTasksView)
- ✅ Search in page header on company pages (Task 1, CompanyView)
- ✅ Search removed from FilterBar (Task 1, FilterBar)
- ✅ Company filter dropdown in FilterBar, All Tasks only (Task 2)
- ✅ Notes column header in TaskList (Task 3)
- ✅ Notes cell in TaskRow — truncated, click to edit, save on blur, Escape to cancel (Task 3)

**Placeholder scan:** None found. All steps contain complete file contents.

**Type consistency:**
- `Filters` type modified in Task 1 (remove `search`) and Task 2 (add `company`) — downstream `defaultFilters` updated in both tasks, `useState<Filters>(defaultFilters)` in TaskList is unaffected
- `search?: string` prop added to TaskList in Task 1 — AllTasksView and CompanyView pass it in Task 1; no mismatches
- `gridTemplateColumns` string updated consistently in both TaskList header and TaskRow desktop grid in Task 3
