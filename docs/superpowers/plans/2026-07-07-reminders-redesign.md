# Reminders Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Reminders tab with grouped collapsible sections, a project-task toggle, per-task pinning from task rows, and a global quick-add bell in the sidebar.

**Architecture:** A new `user_pinned_tasks` table tracks which tasks each user has pinned. Server pages fetch pinned task IDs and pass them down to TaskRow for optimistic pin toggling. RemindersView merges personal reminders + pinned tasks + (optionally) project tasks client-side, groups them by due date, and renders collapsible sections. A `QuickAddReminder` component in the sidebar header opens a popup that calls the existing `createReminder` server action.

**Tech Stack:** Next.js 16.2.6 App Router, React 19, TypeScript, Tailwind v4, Supabase PostgreSQL, date-fns, lucide-react

---

## File Structure

- **Modify:** `app/(app)/actions/reminders.ts` — add `pinTask`, `unpinTask`, `getMyTasks` server actions
- **Modify:** `components/sidebar/Sidebar.tsx` — add `QuickAddReminder` sub-component
- **Modify:** `app/(app)/company/[id]/page.tsx` — fetch pinnedTaskIds, pass to CompanyView
- **Modify:** `app/(app)/tasks/page.tsx` — fetch pinnedTaskIds, pass to AllTasksView
- **Modify:** `app/(app)/company/[id]/CompanyView.tsx` — accept + pass pinnedTaskIds to TaskList
- **Modify:** `app/(app)/tasks/AllTasksView.tsx` — accept + pass pinnedTaskIds to TaskList
- **Modify:** `components/tasks/TaskList.tsx` — accept + pass pinnedTaskIds to TaskRow
- **Modify:** `components/tasks/TaskRow.tsx` — add pin icon with optimistic toggle
- **Modify:** `app/(app)/reminders/page.tsx` — fetch pinnedTaskIds + pinned tasks + companies + people
- **Modify:** `app/(app)/reminders/RemindersView.tsx` — full rewrite with groups, toggle, deduplication
- **Supabase SQL** — run migration for `user_pinned_tasks` table with RLS

---

### Task 1: Supabase migration — user_pinned_tasks table

**Files:**
- Supabase SQL editor (dashboard)

- [ ] **Step 1: Run the migration in Supabase SQL editor**

Go to your Supabase project → SQL Editor → New query. Paste and run:

```sql
create table user_pinned_tasks (
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, task_id)
);

alter table user_pinned_tasks enable row level security;

create policy "Users manage their own pins"
  on user_pinned_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Verify table exists**

In Supabase → Table Editor, confirm `user_pinned_tasks` appears with columns: `user_id`, `task_id`, `created_at`.

- [ ] **Step 3: Commit migration note**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git commit --allow-empty -m "chore: add user_pinned_tasks migration (run in Supabase SQL editor)"
```

---

### Task 2: Server actions — pinTask, unpinTask, getMyTasks

**Files:**
- Modify: `app/(app)/actions/reminders.ts`

- [ ] **Step 1: Add pinTask, unpinTask, and getMyTasks to reminders.ts**

Replace the entire contents of `app/(app)/actions/reminders.ts` with:

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Task } from '@/types/database'

export async function createReminder(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('reminders').insert({
    user_id: user.id,
    title,
    details: (formData.get('details') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
  })
  if (error) return { error: 'Failed to create reminder' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function snoozeReminder(id: string, until: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reminders')
    .update({ snoozed_until: until })
    .eq('id', id)
  if (error) return { error: 'Failed to snooze' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function completeReminder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reminders')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: 'Failed to complete' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function updateReminder(id: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()
  const { error } = await supabase.from('reminders').update({
    title,
    details: (formData.get('details') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
  }).eq('id', id)

  if (error) return { error: 'Failed to update reminder' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) return { error: 'Failed to delete' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function pinTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('user_pinned_tasks')
    .insert({ user_id: user.id, task_id: taskId })
  if (error) return { error: 'Failed to pin task' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function unpinTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('user_pinned_tasks')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', user.id)
  if (error) return { error: 'Failed to unpin task' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function getMyTasks(name: string): Promise<Task[]> {
  if (!name) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('responsible', name)
    .neq('status', 'done')
    .is('deleted_at', null)
    .is('parent_task_id', null)
    .order('due_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as Task[]
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add app/\(app\)/actions/reminders.ts
git commit -m "feat: add pinTask, unpinTask, getMyTasks server actions"
```

---

### Task 3: QuickAddReminder popup in Sidebar

**Files:**
- Modify: `components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Replace the full contents of Sidebar.tsx**

```tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, Settings, Trash2, Menu, X, Bell } from 'lucide-react'
import { createReminder } from '@/app/(app)/actions/reminders'
import type { Company } from '@/types/database'

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
}

function QuickAddReminder() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createReminder(fd)
    if (result?.success) {
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
        aria-label="Quick add reminder"
      >
        <Bell size={14} />
        <Plus size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 bg-white border rounded-xl shadow-lg p-4 w-64 z-50">
          <p className="text-xs font-semibold text-gray-700 mb-3">Quick reminder</p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              name="title"
              required
              autoFocus
              placeholder="What do you need to remember?"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              name="due_date"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ companies }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      active
        ? 'bg-slate-700 text-emerald-400 font-medium'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`

  const nav = (
    <>
      <Link href="/tasks" className={linkClass(pathname === '/tasks')} onClick={() => setMobileOpen(false)}>
        <LayoutGrid size={15} />
        All Tasks
      </Link>
      <div className="mt-3 mb-1 px-3 text-xs text-slate-500 uppercase tracking-wide">
        Companies
      </div>
      {companies.map(c => (
        <Link
          key={c.id}
          href={`/company/${c.id}`}
          className={linkClass(pathname === `/company/${c.id}`)}
          onClick={() => setMobileOpen(false)}
        >
          {c.name}
        </Link>
      ))}
      {companies.length === 0 && (
        <p className="px-3 py-2 text-xs text-slate-500">No companies yet.</p>
      )}
    </>
  )

  const bottom = (
    <>
      <Link href="/reminders" className={linkClass(pathname === '/reminders')} onClick={() => setMobileOpen(false)}>
        <Bell size={14} />
        Reminders
      </Link>
      <Link href="/company/new" className={linkClass(pathname === '/company/new')} onClick={() => setMobileOpen(false)}>
        <Plus size={14} />
        Add company
      </Link>
      <Link href="/settings" className={linkClass(pathname === '/settings')} onClick={() => setMobileOpen(false)}>
        <Settings size={14} />
        Settings & Links
      </Link>
      <Link
        href="/trash"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          pathname === '/trash'
            ? 'bg-slate-700 text-emerald-400 font-medium'
            : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'
        }`}
        onClick={() => setMobileOpen(false)}
      >
        <Trash2 size={14} />
        Trash
      </Link>
    </>
  )

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 md:hidden bg-white border rounded-lg p-1.5 shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-56 bg-slate-800 border-r border-slate-700 flex flex-col h-full shrink-0
          transition-transform duration-200 md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <span className="font-semibold text-white">Project Tracker</span>
          <div className="flex items-center gap-2">
            <QuickAddReminder />
            <button
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">{nav}</nav>
        <div className="p-2 border-t border-slate-700 space-y-0.5">{bottom}</div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/sidebar/Sidebar.tsx
git commit -m "feat: add quick-add reminder popup to sidebar header"
```

---

### Task 4: Pin icon on TaskRow + prop threading

**Files:**
- Modify: `components/tasks/TaskRow.tsx`
- Modify: `components/tasks/TaskList.tsx`
- Modify: `app/(app)/company/[id]/CompanyView.tsx`
- Modify: `app/(app)/tasks/AllTasksView.tsx`
- Modify: `app/(app)/company/[id]/page.tsx`
- Modify: `app/(app)/tasks/page.tsx`

The pin icon lives in the task name cell of the desktop grid. It is hidden by default and shown on row hover. Clicking it calls `pinTask` or `unpinTask` with optimistic state.

- [ ] **Step 1: Update TaskRow.tsx — add pinnedTaskIds prop and pin icon**

At the top of `components/tasks/TaskRow.tsx`, the current imports are:
```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'
import Toast from '@/components/ui/Toast'
```

Replace with:
```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Pin } from 'lucide-react'
import { updateTask } from '@/app/(app)/actions/tasks'
import { pinTask, unpinTask } from '@/app/(app)/actions/reminders'
import type { Task } from '@/types/database'
import Toast from '@/components/ui/Toast'
```

- [ ] **Step 2: Add pinnedTaskIds to the Props interface**

Find:
```tsx
interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  people?: string[]
  showReminder?: boolean
  onSelect: (task: Task) => void
}
```

Replace with:
```tsx
interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  subtaskCount?: number
  people?: string[]
  showReminder?: boolean
  pinnedTaskIds?: string[]
  onSelect: (task: Task) => void
}
```

- [ ] **Step 3: Add pinned state and handler inside the component**

Find the line:
```tsx
export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, people = [], showReminder = false, onSelect }: Props) {
```

Replace with:
```tsx
export default function TaskRow({ task, showCompany, companyName, subtaskCount = 0, people = [], showReminder = false, pinnedTaskIds = [], onSelect }: Props) {
```

Then find:
```tsx
  const [toast, setToast] = useState<{ id: number; message: string; undo: () => void } | null>(null)
```

Add these two lines immediately after:
```tsx
  const [pinned, setPinned] = useState(pinnedTaskIds.includes(task.id))
  const toastIdRef = useRef(0)
```

Wait — `toastIdRef` is already declared right after `toast`. So find exactly:
```tsx
  const [toast, setToast] = useState<{ id: number; message: string; undo: () => void } | null>(null)
  const toastIdRef = useRef(0)
```

Replace with:
```tsx
  const [toast, setToast] = useState<{ id: number; message: string; undo: () => void } | null>(null)
  const [pinned, setPinned] = useState(pinnedTaskIds.includes(task.id))
  const toastIdRef = useRef(0)
```

- [ ] **Step 4: Add pin toggle handler**

Find:
```tsx
  async function save(field: string, value: string) {
```

Add this function immediately before it:
```tsx
  async function handlePinToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !pinned
    setPinned(next)
    const result = next ? await pinTask(task.id) : await unpinTask(task.id)
    if (result?.error) setPinned(!next)
  }

```

- [ ] **Step 5: Add pin icon to the task name cell**

In the desktop grid, find the task name cell:
```tsx
          {/* Task name */}
          <div className="flex items-center gap-1 min-w-0">
            {editingName ? (
```

Replace the opening `<div>` line with:
```tsx
          {/* Task name */}
          <div className="group/row flex items-center gap-1 min-w-0">
```

Then find the closing of the task name cell — the `</div>` that closes the name cell (after the `</button>` of the non-editing state). The full cell ends after:
```tsx
            )}
          </div>
```

The pin icon should be placed just before the closing `</div>` of the name cell. Find this exact block:

```tsx
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
```

Replace with:
```tsx
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
            <button
              onClick={handlePinToggle}
              className={`ml-1 shrink-0 transition-colors ${
                pinned
                  ? 'text-emerald-500'
                  : 'text-transparent group-hover/row:text-gray-300 hover:!text-emerald-400'
              }`}
              title={pinned ? 'Unpin from Reminders' : 'Pin to Reminders'}
            >
              <Pin size={12} />
            </button>
          </div>
```

- [ ] **Step 6: Update TaskList.tsx — add pinnedTaskIds prop**

Find:
```tsx
interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
  search?: string
  showReminder?: boolean
}
```

Replace with:
```tsx
interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  people?: string[]
  search?: string
  showReminder?: boolean
  pinnedTaskIds?: string[]
}
```

Find:
```tsx
export default function TaskList({ tasks, showCompany, companies = {}, people = [], search = '', showReminder = false }: Props) {
```

Replace with:
```tsx
export default function TaskList({ tasks, showCompany, companies = {}, people = [], search = '', showReminder = false, pinnedTaskIds = [] }: Props) {
```

Find each `<TaskRow` call and add the `pinnedTaskIds` prop. There is one TaskRow in the rendered list:
```tsx
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  people={people}
                  showReminder={showReminder}
                  onSelect={setSelectedTask}
                />
```

Replace with:
```tsx
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  subtaskCount={subtaskCounts[task.id] ?? 0}
                  people={people}
                  showReminder={showReminder}
                  pinnedTaskIds={pinnedTaskIds}
                  onSelect={setSelectedTask}
                />
```

- [ ] **Step 7: Update CompanyView.tsx — add pinnedTaskIds prop**

Find:
```tsx
interface Props {
  company: Company
  tasks: Task[]
  people: string[]
  showReminder?: boolean
}
```

Replace with:
```tsx
interface Props {
  company: Company
  tasks: Task[]
  people: string[]
  showReminder?: boolean
  pinnedTaskIds?: string[]
}
```

Find:
```tsx
export default function CompanyView({ company, tasks, people, showReminder }: Props) {
```

Replace with:
```tsx
export default function CompanyView({ company, tasks, people, showReminder, pinnedTaskIds = [] }: Props) {
```

Find:
```tsx
          <TaskList tasks={tasks} people={people} search={search} showReminder={showReminder} />
```

Replace with:
```tsx
          <TaskList tasks={tasks} people={people} search={search} showReminder={showReminder} pinnedTaskIds={pinnedTaskIds} />
```

- [ ] **Step 8: Update AllTasksView.tsx — add pinnedTaskIds prop**

Find:
```tsx
interface Props {
  tasks: Task[]
  companies: Record<string, string>
  people: string[]
  showReminder?: boolean
}
```

Replace with:
```tsx
interface Props {
  tasks: Task[]
  companies: Record<string, string>
  people: string[]
  showReminder?: boolean
  pinnedTaskIds?: string[]
}
```

Find:
```tsx
export default function AllTasksView({ tasks, companies, people, showReminder }: Props) {
```

Replace with:
```tsx
export default function AllTasksView({ tasks, companies, people, showReminder, pinnedTaskIds = [] }: Props) {
```

Find:
```tsx
            <TaskList tasks={tasks} showCompany companies={companies} people={people} search={search} showReminder={showReminder} />
```

Replace with:
```tsx
            <TaskList tasks={tasks} showCompany companies={companies} people={people} search={search} showReminder={showReminder} pinnedTaskIds={pinnedTaskIds} />
```

- [ ] **Step 9: Update company/[id]/page.tsx — fetch and pass pinnedTaskIds**

Replace the entire contents of `app/(app)/company/[id]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CompanyView from './CompanyView'

const DANI_USER_ID = 'eb86e161-f13f-4bc2-9736-038136099aff'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: company }, { data: tasks }, { data: people }, { data: pins }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('companies').select('id, name').eq('id', id).single(),
    supabase.from('tasks').select('*').eq('company_id', id).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('people').select('name').order('name'),
    supabase.from('user_pinned_tasks').select('task_id'),
  ])

  if (!company) notFound()

  return (
    <CompanyView
      company={company}
      tasks={tasks ?? []}
      people={(people ?? []).map(p => p.name)}
      showReminder={user?.id === DANI_USER_ID}
      pinnedTaskIds={(pins ?? []).map(p => p.task_id)}
    />
  )
}
```

- [ ] **Step 10: Update tasks/page.tsx — fetch and pass pinnedTaskIds**

Replace the entire contents of `app/(app)/tasks/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import AllTasksView from './AllTasksView'

export const metadata = { title: 'All Tasks' }

const DANI_USER_ID = 'eb86e161-f13f-4bc2-9736-038136099aff'

export default async function TasksPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: tasks }, { data: companies }, { data: people }, { data: pins }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tasks').select('*').is('deleted_at', null).neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('companies').select('id, name'),
    supabase.from('people').select('name').order('name'),
    supabase.from('user_pinned_tasks').select('task_id'),
  ])

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return (
    <AllTasksView
      tasks={tasks ?? []}
      companies={companyMap}
      people={(people ?? []).map(p => p.name)}
      showReminder={user?.id === DANI_USER_ID}
      pinnedTaskIds={(pins ?? []).map(p => p.task_id)}
    />
  )
}
```

- [ ] **Step 11: Type-check**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add components/tasks/TaskRow.tsx components/tasks/TaskList.tsx \
  app/\(app\)/company/\[id\]/CompanyView.tsx app/\(app\)/company/\[id\]/page.tsx \
  app/\(app\)/tasks/AllTasksView.tsx app/\(app\)/tasks/page.tsx
git commit -m "feat: add pin-to-reminders icon on task rows"
```

---

### Task 5: Update reminders page.tsx

**Files:**
- Modify: `app/(app)/reminders/page.tsx`

- [ ] **Step 1: Replace the full contents of page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import RemindersView from './RemindersView'
import type { Task } from '@/types/database'

export const metadata = { title: 'Reminders' }

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: allReminders },
    { data: pins },
    { data: companies },
    { data: people },
  ] = await Promise.all([
    supabase.from('reminders').select('*').eq('user_id', user!.id).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('user_pinned_tasks').select('task_id').eq('user_id', user!.id),
    supabase.from('companies').select('id, name'),
    supabase.from('people').select('name').order('name'),
  ])

  const now = new Date().toISOString()
  const active = (allReminders ?? []).filter(r => !r.completed_at && (!r.snoozed_until || r.snoozed_until <= now))
  const snoozed = (allReminders ?? []).filter(r => !r.completed_at && r.snoozed_until && r.snoozed_until > now)
  const completed = (allReminders ?? []).filter(r => r.completed_at)

  const pinnedTaskIds = (pins ?? []).map(p => p.task_id)
  let pinnedTasks: Task[] = []
  if (pinnedTaskIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .in('id', pinnedTaskIds)
      .neq('status', 'done')
      .is('deleted_at', null)
    pinnedTasks = (data ?? []) as Task[]
  }

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return (
    <RemindersView
      active={active}
      snoozed={snoozed}
      completed={completed}
      pinnedTasks={pinnedTasks}
      companies={companyMap}
      people={(people ?? []).map(p => p.name)}
    />
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool" && npx tsc --noEmit
```

Expected: errors in RemindersView (props mismatch) — that's fine, Task 6 fixes it.

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add app/\(app\)/reminders/page.tsx
git commit -m "feat: reminders page fetches pinned tasks, companies, people"
```

---

### Task 6: RemindersView.tsx full rewrite

**Files:**
- Modify: `app/(app)/reminders/RemindersView.tsx`

This is a full rewrite. The view merges personal reminders + pinned tasks + optional project tasks, groups them by due date, and renders collapsible sections.

- [ ] **Step 1: Replace the full contents of RemindersView.tsx**

```tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { format, addHours, addDays } from 'date-fns'
import { Bell, Check, Clock, Trash2, Plus, ChevronDown, ChevronRight, Pencil, Pin } from 'lucide-react'
import { createReminder, updateReminder, snoozeReminder, completeReminder, deleteReminder, getMyTasks, unpinTask } from '@/app/(app)/actions/reminders'
import StatusBadge from '@/components/tasks/StatusBadge'
import type { Task } from '@/types/database'

interface Reminder {
  id: string
  title: string
  details: string | null
  due_date: string | null
  snoozed_until: string | null
  completed_at: string | null
  created_at: string
}

interface Props {
  active: Reminder[]
  snoozed: Reminder[]
  completed: Reminder[]
  pinnedTasks: Task[]
  companies: Record<string, string>
  people: string[]
}

type ListItem =
  | { kind: 'reminder'; data: Reminder }
  | { kind: 'task'; data: Task; pinned: boolean }

type GroupKey = 'overdue' | 'today' | 'next' | 'scheduled' | 'unscheduled'

const GROUPS: { key: GroupKey; label: string; defaultOpen: boolean }[] = [
  { key: 'overdue',     label: 'Overdue',       defaultOpen: true  },
  { key: 'today',       label: 'Today',          defaultOpen: true  },
  { key: 'next',        label: 'Next · 7 days',  defaultOpen: true  },
  { key: 'scheduled',   label: 'Scheduled',      defaultOpen: false },
  { key: 'unscheduled', label: 'Unscheduled',    defaultOpen: false },
]

function getGroup(dueDate: string | null): GroupKey {
  if (!dueDate) return 'unscheduled'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 7) return 'next'
  return 'scheduled'
}

function SnoozeMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const options = [
    { label: '1 hour',  until: addHours(new Date(), 1).toISOString() },
    { label: 'Tomorrow', until: addDays(new Date(), 1).toISOString() },
    { label: '3 days',  until: addDays(new Date(), 3).toISOString() },
    { label: '1 week',  until: addDays(new Date(), 7).toISOString() },
  ]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
      >
        <Clock size={12} />
        Snooze
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 bg-white border rounded-lg shadow-lg z-50 min-w-28 py-1">
          {options.map(o => (
            <button
              key={o.label}
              onClick={async () => { setOpen(false); await snoozeReminder(id, o.until) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ReminderRow({ r, dim }: { r: Reminder; dim?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const isOverdue = r.due_date && !r.completed_at && new Date(r.due_date) < new Date()

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const result = await updateReminder(r.id, fd)
    if (!result.error) setEditing(false)
    setSaving(false)
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className={`px-4 py-3 border-b last:border-0 space-y-2 ${dim ? 'opacity-50' : ''}`}>
        <input name="title" defaultValue={r.title} required autoFocus placeholder="Reminder title"
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <textarea name="details" defaultValue={r.details ?? ''} rows={2} placeholder="Details (optional)"
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        <input type="date" name="due_date" defaultValue={r.due_date ?? ''}
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 ${dim ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${r.completed_at ? 'line-through text-gray-400' : 'text-gray-900'}`}>{r.title}</p>
        {r.details && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{r.details}</p>}
        {r.due_date && (
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            Due {format(new Date(r.due_date), 'MMM d, yyyy')}{isOverdue ? ' — overdue' : ''}
          </p>
        )}
      </div>
      {!r.completed_at && (
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Edit">
            <Pencil size={13} />
          </button>
          <SnoozeMenu id={r.id} />
          <button onClick={() => completeReminder(r.id)} className="text-gray-400 hover:text-green-500 transition-colors" aria-label="Mark done">
            <Check size={14} />
          </button>
          <button onClick={() => deleteReminder(r.id)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      )}
      {r.completed_at && (
        <button onClick={() => deleteReminder(r.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5" aria-label="Delete">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function TaskItem({ task, pinned, companies }: { task: Task; pinned: boolean; companies: Record<string, string> }) {
  const [localPinned, setLocalPinned] = useState(pinned)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  async function handleUnpin() {
    setLocalPinned(false)
    const result = await unpinTask(task.id)
    if (result?.error) setLocalPinned(true)
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{task.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {companies[task.company_id] && (
            <span className="text-xs text-gray-400">{companies[task.company_id]}</span>
          )}
          {task.due_date && (
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              Due {format(new Date(task.due_date), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <StatusBadge status={task.status} />
        {localPinned && (
          <button
            onClick={handleUnpin}
            className="text-emerald-500 hover:text-gray-400 transition-colors"
            title="Unpin from Reminders"
          >
            <Pin size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function GroupSection({
  groupKey,
  label,
  items,
  companies,
  defaultOpen,
}: {
  groupKey: GroupKey
  label: string
  items: ListItem[]
  companies: Record<string, string>
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null

  const borderColor = groupKey === 'overdue' ? 'border-red-200' : 'border-gray-200'

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-1 py-1.5 text-left"
      >
        {open ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${groupKey === 'overdue' ? 'text-red-500' : groupKey === 'today' ? 'text-amber-600' : 'text-gray-500'}`}>
          {label}
        </span>
        <span className="text-xs text-gray-400">{items.length}</span>
      </button>
      {open && (
        <div className={`bg-white border ${borderColor} rounded-xl overflow-hidden`}>
          {items.map((item) =>
            item.kind === 'reminder'
              ? <ReminderRow key={`r-${item.data.id}`} r={item.data} />
              : <TaskItem key={`t-${item.data.id}`} task={item.data} pinned={item.pinned} companies={companies} />
          )}
        </div>
      )}
    </div>
  )
}

export default function RemindersView({ active, snoozed, completed, pinnedTasks, companies, people }: Props) {
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [myName, setMyName] = useState('')
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  useEffect(() => {
    setShowTasks(localStorage.getItem('reminders_show_tasks') === 'true')
    setMyName(localStorage.getItem('reminders_my_name') ?? '')
  }, [])

  useEffect(() => {
    localStorage.setItem('reminders_show_tasks', showTasks ? 'true' : 'false')
    if (!showTasks) { setMyTasks([]); return }
    if (myName) fetchMyTasks()
  }, [showTasks])

  useEffect(() => {
    localStorage.setItem('reminders_my_name', myName)
    if (showTasks && myName) fetchMyTasks()
    else if (!myName) setMyTasks([])
  }, [myName])

  async function fetchMyTasks() {
    if (!myName) return
    setLoadingTasks(true)
    const tasks = await getMyTasks(myName)
    setMyTasks(tasks)
    setLoadingTasks(false)
  }

  const allItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = active.map(r => ({ kind: 'reminder', data: r }))
    const seen = new Set<string>()
    for (const task of pinnedTasks) {
      seen.add(task.id)
      items.push({ kind: 'task', data: task, pinned: true })
    }
    if (showTasks) {
      for (const task of myTasks) {
        if (!seen.has(task.id)) {
          seen.add(task.id)
          items.push({ kind: 'task', data: task, pinned: false })
        }
      }
    }
    return items
  }, [active, pinnedTasks, myTasks, showTasks])

  function itemsForGroup(key: GroupKey): ListItem[] {
    return allItems
      .filter(item => getGroup(item.data.due_date) === key)
      .sort((a, b) => {
        const da = a.data.due_date
        const db = b.data.due_date
        if (!da) return 1
        if (!db) return -1
        return da.localeCompare(db)
      })
  }

  const inputClass = 'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createReminder(fd)
    if (result?.success) { setAdding(false); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-emerald-500" />
          <h1 className="text-xl font-semibold text-gray-900">Reminders</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTasks(t => !t)}
            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
              showTasks
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Show my project tasks
          </button>
          <button
            onClick={() => setAdding(a => !a)}
            className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus size={14} />
            Add reminder
          </button>
        </div>
      </div>

      {showTasks && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Assigned to:</span>
          <select
            value={myName}
            onChange={e => setMyName(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">— pick a name —</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {loadingTasks && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
      )}

      {adding && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reminder *</label>
            <input name="title" required placeholder="What do you need to remember?" className={inputClass} autoFocus />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Details</label>
            <textarea name="details" rows={2} placeholder="Any extra context…" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Due date</label>
            <input type="date" name="due_date" className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {allItems.length === 0 && snoozed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active reminders.</p>
        </div>
      ) : (
        <>
          {GROUPS.map(g => (
            <GroupSection
              key={g.key}
              groupKey={g.key}
              label={g.label}
              items={itemsForGroup(g.key)}
              companies={companies}
              defaultOpen={g.defaultOpen}
            />
          ))}

          {snoozed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-1 mb-2">Snoozed</p>
              <div className="bg-white border border-gray-200 rounded-xl">
                {snoozed.map(r => <ReminderRow key={r.id} r={r} dim />)}
              </div>
            </div>
          )}
        </>
      )}

      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 mb-2"
          >
            {showCompleted ? 'Hide' : 'Show'} {completed.length} completed
          </button>
          {showCompleted && (
            <div className="bg-white border rounded-xl">
              {completed.map(r => <ReminderRow key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}
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
2. Check the sidebar header — a small bell+plus icon should appear next to "Project Tracker"
3. Click it — popup should appear with title and due date fields
4. Add a reminder via the popup — it should save (navigate to /reminders to confirm)
5. Navigate to /reminders — you should see grouped sections (Overdue / Today / Next / Scheduled / Unscheduled)
6. Empty groups should be hidden entirely
7. Click a group header — it should collapse/expand
8. Click "Show my project tasks" toggle — it turns green, a name dropdown appears
9. Select "Dani" from the name dropdown — tasks where responsible = Dani should appear in the groups
10. Navigate to All Tasks — hover a task row — a pin icon should appear in the task name area
11. Click the pin icon — it should fill green (pinned)
12. Navigate to /reminders — the pinned task should appear in the appropriate group
13. Click the green pin icon in the reminders view — it should unpin (pin icon disappears)

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool"
git add app/\(app\)/reminders/RemindersView.tsx
git commit -m "feat: redesign reminders tab with grouped sections, task toggle, and pinning"
```
