# Editable People List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `KNOWN_NAMES` list with a Supabase-backed people table, add a Settings UI to manage it, and update the task form Responsible field to use a dropdown with inline add.

**Architecture:** New `people` table in Supabase with RLS. Server actions for add/rename/delete. Names thread down from page-level fetches through CompanyView/AllTasksView → TaskList → TaskRow. TaskForm Responsible field becomes a select with a special "Add new person…" option that calls the addPerson action inline.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Supabase SSR, server actions with `revalidatePath('/', 'layout')`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| Supabase SQL Editor | Migration | Create `people` table |
| `app/(app)/actions/people.ts` | Create | addPerson, renamePerson, deletePerson server actions |
| `app/(app)/settings/PeopleSection.tsx` | Create | UI to list/add/rename/delete people |
| `app/(app)/settings/page.tsx` | Modify | Fetch people, render PeopleSection |
| `components/tasks/TaskRow.tsx` | Modify | Remove KNOWN_NAMES, accept `people: string[]` prop |
| `components/tasks/TaskPanel.tsx` | Modify | Accept `people: string[]` prop, remove `getKnownNames()` fetch |
| `components/tasks/AddTaskButton.tsx` | Modify | Accept `people: string[]` prop, pass to TaskForm |
| `components/tasks/TaskList.tsx` | Modify | Accept and thread `people` prop to TaskRow, TaskPanel |
| `app/(app)/company/[id]/CompanyView.tsx` | Modify | Accept and pass `people` prop to TaskList and AddTaskButton |
| `app/(app)/company/[id]/page.tsx` | Modify | Fetch people from Supabase, pass to CompanyView |
| `app/(app)/tasks/AllTasksView.tsx` | Modify | Accept and pass `people` prop to TaskList |
| `app/(app)/tasks/page.tsx` | Modify | Fetch people from Supabase, pass to AllTasksView |
| `components/tasks/TaskForm.tsx` | Modify | Responsible → select dropdown with inline add |

---

### Task 1: Run Supabase migration

**This must happen before any code is deployed.**

- [ ] **Step 1: Open Supabase SQL Editor**

Go to https://supabase.com/dashboard/project/gglvlgvglzhatqzrbqtx/sql/new

- [ ] **Step 2: Run this SQL**

```sql
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table people enable row level security;
create policy "own people" on people
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on people (user_id);
```

- [ ] **Step 3: Verify the table exists**

In the Supabase Table Editor, confirm the `people` table appears with columns: id, user_id, name, created_at.

- [ ] **Step 4: Seed initial data**

Run this in the SQL Editor, replacing the user_id with Dani's actual UUID (find it in Authentication → Users):

```sql
-- First get your user_id:
select id from auth.users where email = 'daniellesilvestri@gmail.com';

-- Then insert (replace YOUR_USER_ID with the result above):
insert into people (user_id, name) values
  ('YOUR_USER_ID', 'Dani'),
  ('YOUR_USER_ID', 'Mike'),
  ('YOUR_USER_ID', 'Rick Sr'),
  ('YOUR_USER_ID', 'Rick Jr'),
  ('YOUR_USER_ID', 'Renato'),
  ('YOUR_USER_ID', 'Vitor');
```

---

### Task 2: Create people server actions

**File:** Create `app/(app)/actions/people.ts`

- [ ] **Step 1: Create the file**

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addPerson(name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return { error: 'That name already exists' }

  const { error } = await supabase.from('people').insert({ name: trimmed })
  if (error) return { error: 'Failed to add person' }

  revalidatePath('/', 'layout')
  return {}
}

export async function renamePerson(id: string, name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .ilike('name', trimmed)
    .neq('id', id)
    .maybeSingle()

  if (existing) return { error: 'That name already exists' }

  const { error } = await supabase.from('people').update({ name: trimmed }).eq('id', id)
  if (error) return { error: 'Failed to rename person' }

  revalidatePath('/', 'layout')
  return {}
}

export async function deletePerson(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) return { error: 'Failed to delete person' }

  revalidatePath('/', 'layout')
  return {}
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `people.ts`

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add "app/(app)/actions/people.ts"
git commit -m "feat: add people server actions (add, rename, delete)"
```

---

### Task 3: Create PeopleSection component

**File:** Create `app/(app)/settings/PeopleSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useState } from 'react'
import { X, Check, Pencil } from 'lucide-react'
import { addPerson, renamePerson, deletePerson } from '@/app/(app)/actions/people'

interface Person {
  id: string
  name: string
}

interface Props {
  people: Person[]
}

export default function PeopleSection({ people }: Props) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    setError(null)
    const result = await addPerson(newName)
    if (result.error) {
      setError(result.error)
    } else {
      setNewName('')
    }
    setAdding(false)
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) {
      setEditingId(null)
      return
    }
    setError(null)
    const result = await renamePerson(id, editingName)
    if (result.error) {
      setError(result.error)
    } else {
      setEditingId(null)
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditingName(person.name)
    setError(null)
  }

  async function handleDelete(id: string) {
    setError(null)
    const result = await deletePerson(id)
    if (result.error) setError(result.error)
  }

  const inputClass =
    'border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">People</h2>
      <p className="text-xs text-gray-500 mb-4">
        These names appear in the Responsible and Waiting On dropdowns.
      </p>

      {people.length === 0 ? (
        <p className="text-xs text-gray-400 mb-4">Add your first person below.</p>
      ) : (
        <ul className="space-y-1 mb-4">
          {people.map(p => (
            <li key={p.id} className="flex items-center gap-2">
              {editingId === p.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(p.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => handleRename(p.id)}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(p.id)}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <Check size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800 py-1">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Rename"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a name…"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `PeopleSection.tsx`

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add "app/(app)/settings/PeopleSection.tsx"
git commit -m "feat: add PeopleSection component for managing people list"
```

---

### Task 4: Wire PeopleSection into settings page

**File:** Modify `app/(app)/settings/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { createClient } from '@/lib/supabase/server'
import ShareLinksSection from './ShareLinksSection'
import InviteSection from './InviteSection'
import PeopleSection from './PeopleSection'
import type { ShareLink } from '@/types/database'

export const metadata = { title: 'Settings & Links' }

export default async function SettingsPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: links }, { data: people }] = await Promise.all([
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('share_links').select('*, company:company_id(name)').eq('active', true),
    supabase.from('people').select('id, name').order('name'),
  ])

  const enrichedLinks = (links ?? []).map(l => ({
    ...(l as ShareLink),
    companyName:
      l.company && typeof l.company === 'object' && 'name' in l.company
        ? (l.company as { name: string }).name
        : '',
  }))

  return (
    <div className="p-6 max-w-lg space-y-10">
      <h1 className="text-xl font-semibold text-gray-900">Settings & Links</h1>
      <PeopleSection people={people ?? []} />
      <hr />
      <InviteSection />
      <hr />
      <ShareLinksSection companies={companies ?? []} links={enrichedLinks} />
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add "app/(app)/settings/page.tsx"
git commit -m "feat: add People section to Settings page"
```

---

### Task 5: Update TaskRow — remove hardcoded names, accept prop

**File:** Modify `components/tasks/TaskRow.tsx`

- [ ] **Step 1: Remove the KNOWN_NAMES constant and add the prop**

Change the top of the file from:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

const KNOWN_NAMES = ['Dani', 'Mike', 'Rick Sr', 'Rick Jr', 'Renato', 'Vitor']

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  onSelect: (task: Task) => void
}

export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, onSelect }: Props) {
```

To:

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
```

- [ ] **Step 2: Replace KNOWN_NAMES references in the select options**

Find both select elements that use `KNOWN_NAMES.map(...)` (Responsible and Waiting On) and change `KNOWN_NAMES` to `people`:

```tsx
{/* Responsible select — change KNOWN_NAMES to people */}
{people.map(n => <option key={n} value={n}>{n}</option>)}

{/* Waiting on select — change KNOWN_NAMES to people */}
{people.map(n => <option key={n} value={n}>{n}</option>)}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskRow.tsx
git commit -m "feat: TaskRow accepts people prop instead of hardcoded names"
```

---

### Task 6: Update TaskPanel — accept people prop, remove getKnownNames fetch

**File:** Modify `components/tasks/TaskPanel.tsx`

TaskPanel currently calls `getKnownNames()` (a server action that reads distinct names from existing tasks) in a `useEffect`. Replace this with a `people: string[]` prop so names come from the Supabase `people` table instead.

- [ ] **Step 1: Update the Props interface and remove the useEffect**

Change the top of the file:

```tsx
'use client'
import { useState } from 'react'
import { X, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import TaskPanelField from './TaskPanelField'
import TaskForm from './TaskForm'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import SubtaskList from './SubtaskList'
import Toast from '@/components/ui/Toast'
import { updateTask, softDeleteTask, restoreTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  task: Task | null
  subtasks?: Task[]
  people?: string[]
  onClose: () => void
}

export default function TaskPanel({ task, subtasks = [], people = [], onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [deletedTaskId, setDeletedTaskId] = useState<string | null>(null)
  const [deletedTaskName, setDeletedTaskName] = useState('')
```

Note: remove the `useEffect` and `useState` for `knownNames`, and remove the `getKnownNames` import from the tasks actions import line.

- [ ] **Step 2: Replace knownNames references with people**

Replace every occurrence of `knownNames` in the file with `people`:
- `knownNames={knownNames}` on the TaskForm → `knownNames={people}`
- `{knownNames.map(...)}` on the datalist → `{people.map(...)}`

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskPanel.tsx
git commit -m "feat: TaskPanel accepts people prop instead of fetching names client-side"
```

---

### Task 7: Update AddTaskButton — accept and pass people prop

**File:** Modify `components/tasks/AddTaskButton.tsx`

Currently AddTaskButton renders TaskForm without passing `knownNames`, so the dropdown will be empty. Add a `people` prop and pass it through.

- [ ] **Step 1: Replace the file**

```tsx
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/AddTaskButton.tsx
git commit -m "feat: AddTaskButton accepts people prop and passes to TaskForm"
```

---

### Task 8: Update TaskList — thread people prop to TaskRow and TaskPanel

**File:** Modify `components/tasks/TaskList.tsx`

- [ ] **Step 1: Add people to the Props interface and pass it through**

Change:

```tsx
interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
}

export default function TaskList({ tasks, showCompany, companies = {} }: Props) {
```

To:

```tsx
interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
}

export default function TaskList({ tasks, showCompany, companies = {}, people = [] }: Props) {
```

- [ ] **Step 2: Pass people to TaskRow and TaskPanel**

Find the `<TaskRow ... />` usage and add the prop:

```tsx
<TaskRow
  key={task.id}
  task={task}
  showCompany={showCompany}
  companyName={companies[task.company_id]}
  subtaskCount={subtaskCounts[task.id] ?? 0}
  people={people}
  onSelect={setSelectedTask}
/>
```

Find the `<TaskPanel ... />` usage and add the prop:

```tsx
<TaskPanel
  task={selectedTask}
  subtasks={selectedTask ? subtasksFor(selectedTask.id) : []}
  people={people}
  onClose={() => setSelectedTask(null)}
/>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskList.tsx
git commit -m "feat: thread people prop through TaskList to TaskRow and TaskPanel"
```

---

### Task 9: Update company page — fetch people and pass through

**Files:** Modify `app/(app)/company/[id]/page.tsx` and `app/(app)/company/[id]/CompanyView.tsx`

- [ ] **Step 1: Update CompanyView to accept and pass people to TaskList and AddTaskButton**

Change `app/(app)/company/[id]/CompanyView.tsx`:

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

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
        <div className="flex items-center gap-2">
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
          <TaskList tasks={tasks} people={people} />
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update company page to fetch people**

Replace `app/(app)/company/[id]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CompanyView from './CompanyView'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: company }, { data: tasks }, { data: people }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('id', id).single(),
    supabase
      .from('tasks')
      .select('*')
      .eq('company_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('people').select('name').order('name'),
  ])

  if (!company) notFound()

  return (
    <CompanyView
      company={company}
      tasks={tasks ?? []}
      people={(people ?? []).map(p => p.name)}
    />
  )
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add "app/(app)/company/[id]/page.tsx" "app/(app)/company/[id]/CompanyView.tsx"
git commit -m "feat: fetch and pass people list to company task view"
```

---

### Task 10: Update All Tasks page — fetch people and pass through

**Files:** Modify `app/(app)/tasks/page.tsx` and `app/(app)/tasks/AllTasksView.tsx`

- [ ] **Step 1: Update AllTasksView to accept and pass people**

Replace `app/(app)/tasks/AllTasksView.tsx`:

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

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">All Tasks</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No open tasks across any company.</p>
      ) : (
        <div className="flex-1 overflow-hidden">
          {view === 'list' ? (
            <TaskList tasks={tasks} showCompany companies={companies} people={people} />
          ) : (
            <TaskBoard tasks={tasks} />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update tasks page to fetch people**

Replace `app/(app)/tasks/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import AllTasksView from './AllTasksView'

export const metadata = { title: 'All Tasks' }

export default async function TasksPage() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: companies }, { data: people }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('companies').select('id, name'),
    supabase.from('people').select('name').order('name'),
  ])

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return (
    <AllTasksView
      tasks={tasks ?? []}
      companies={companyMap}
      people={(people ?? []).map(p => p.name)}
    />
  )
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add "app/(app)/tasks/page.tsx" "app/(app)/tasks/AllTasksView.tsx"
git commit -m "feat: fetch and pass people list to all tasks view"
```

---

### Task 11: Update TaskForm — Responsible becomes a dropdown with inline add

**File:** Modify `components/tasks/TaskForm.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client'
import { useState } from 'react'
import type { Task } from '@/types/database'
import { addPerson } from '@/app/(app)/actions/people'

interface Props {
  companyId: string
  task?: Task
  parentTaskId?: string
  knownNames?: string[]
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean } | undefined>
  onCancel: () => void
}

export default function TaskForm({ companyId, task, parentTaskId, knownNames = [], onSubmit, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState<string[]>(knownNames)
  const [responsible, setResponsible] = useState(task?.responsible ?? '')
  const [addingPerson, setAddingPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [addPersonError, setAddPersonError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('company_id', companyId)
    fd.set('responsible', responsible)
    if (parentTaskId) fd.set('parent_task_id', parentTaskId)
    const result = await onSubmit(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleAddPerson() {
    if (!newPersonName.trim()) return
    setAddPersonError(null)
    const result = await addPerson(newPersonName)
    if (result.error) {
      setAddPersonError(result.error)
      return
    }
    const name = newPersonName.trim()
    setPeople(prev => [...prev, name].sort((a, b) => a.localeCompare(b)))
    setResponsible(name)
    setNewPersonName('')
    setAddingPerson(false)
  }

  function handleResponsibleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__add_new__') {
      setAddingPerson(true)
      setNewPersonName('')
      setAddPersonError(null)
    } else {
      setResponsible(e.target.value)
    }
  }

  const inputClass =
    'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <datalist id="form-known-names">
        {people.map(n => <option key={n} value={n} />)}
      </datalist>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Task name *</label>
        <input name="name" required defaultValue={task?.name} className={inputClass} autoFocus />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Responsible</label>
        {addingPerson ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input
                autoFocus
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddPerson() }
                  if (e.key === 'Escape') setAddingPerson(false)
                }}
                placeholder="Enter name…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleAddPerson}
                className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingPerson(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
            {addPersonError && <p className="text-xs text-red-600">{addPersonError}</p>}
          </div>
        ) : (
          <select
            value={responsible}
            onChange={handleResponsibleChange}
            className={inputClass}
          >
            <option value="">—</option>
            {people.map(n => <option key={n} value={n}>{n}</option>)}
            <option value="__add_new__">＋ Add new person…</option>
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select name="status" defaultValue={task?.status ?? 'on_track'} className={inputClass}>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select name="priority" defaultValue={task?.priority ?? 'medium'} className={inputClass}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Due date</label>
          <input type="date" name="due_date" defaultValue={task?.due_date ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Follow-up date</label>
          <input type="date" name="followup_date" defaultValue={task?.followup_date ?? ''} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Waiting on</label>
        <input name="waiting_on" list="form-known-names" defaultValue={task?.waiting_on ?? ''} className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={task?.notes ?? ''}
          rows={3}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : task ? 'Save changes' : 'Add task'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 px-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Check where TaskForm is used and confirm knownNames is being passed**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
grep -rn "TaskForm\|knownNames" --include="*.tsx" .
```

Confirm that wherever `TaskForm` is rendered, `knownNames` is already passed in. If any usage is missing it, add the prop there too.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskForm.tsx
git commit -m "feat: Responsible field becomes dropdown with inline add-person"
```

---

### Task 12: Push to GitHub and deploy

- [ ] **Step 1: Confirm all commits are in order**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git log --oneline -10
```

- [ ] **Step 2: Push using a GitHub PAT**

Generate a PAT at github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) with `repo` scope, then:

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git push https://YOUR_PAT@github.com/danisilvestri22/pm-tool.git main
```

Delete the PAT immediately after pushing.

- [ ] **Step 3: Verify deploy on Vercel**

Wait ~1 minute, then visit https://pm-tool-mu.vercel.app and confirm:
- Settings & Links page shows a People section with the seeded names
- Adding, renaming, and deleting a name works
- Company task list dropdowns show the people list
- All Tasks page dropdowns show the people list
- Adding a new task shows Responsible as a select dropdown
- Selecting "＋ Add new person…" reveals the inline input, saves to DB, and selects the new name
