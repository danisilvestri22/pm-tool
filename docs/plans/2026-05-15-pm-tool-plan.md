# PM Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom project management web app for Dani and Mike to track tasks across multiple companies, with view-only access for others via shared links.

**Architecture:** Next.js App Router for frontend and API routes, Supabase for PostgreSQL database and authentication, deployed to Vercel. Push notifications delivered via Web Push API with a service worker. All data mutations go through typed server actions validated with Zod.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), Vercel (deployment), web-push (notifications), Papa Parse (CSV import), Zod (validation)

**Spec:** `docs/specs/2026-05-15-pm-tool-design.md`

---

## Phase 1 — Project Foundation

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.local` (gitignored)
- Create: `.gitignore`
- Create: `tailwind.config.ts`
- Create: `next.config.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest pm-tool \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd pm-tool
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr \
  web-push \
  papaparse \
  zod \
  date-fns \
  @radix-ui/react-dialog \
  @radix-ui/react-select \
  @radix-ui/react-popover \
  @radix-ui/react-dropdown-menu \
  lucide-react

npm install -D @types/web-push @types/papaparse
```

- [ ] **Step 3: Create `.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=<from Supabase project settings>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase project settings>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase project settings>
VAPID_PUBLIC_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from above command>
VAPID_CONTACT=mailto:daniellesilvestri@gmail.com
```

- [ ] **Step 4: Add `.env.local` to `.gitignore`**

Verify `.gitignore` includes:
```
.env.local
.env*.local
```

- [ ] **Step 5: Initialize git and commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with Supabase and dependencies"
```

---

### Task 2: Supabase Project and Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Create: `types/database.ts`

- [ ] **Step 1: Create Supabase project**

Go to supabase.com, create a new project called "pm-tool". Copy the project URL and anon key into `.env.local`.

- [ ] **Step 2: Write database migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Companies (Oracle, Limetec, MoGo, etc.)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,
  name text not null,
  responsible text,
  status text not null default 'on_track' check (status in ('on_track', 'at_risk', 'completed')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  followup_date date,
  waiting_on text,
  notes text,
  board_column text not null default 'todo' check (board_column in ('todo', 'in_progress', 'done')),
  deleted_at timestamptz,
  asana_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shared view links (per company or all-companies)
create table share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  company_id uuid references companies(id) on delete cascade,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Push notification subscriptions
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, (subscription->>'endpoint'))
);

-- Trigger: update tasks.updated_at automatically
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Row Level Security
alter table companies enable row level security;
alter table tasks enable row level security;
alter table share_links enable row level security;
alter table push_subscriptions enable row level security;

-- Authenticated users (Dani, Mike) can do everything
create policy "authenticated full access" on companies
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tasks
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on share_links
  for all to authenticated using (true) with check (true);

create policy "own push subscriptions" on push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 3: Run migration in Supabase**

In Supabase dashboard → SQL Editor, paste and run the migration.

- [ ] **Step 4: Create Supabase client utilities**

`lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

`lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isSharePage = request.nextUrl.pathname.startsWith('/share/')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  if (!user && !isAuthPage && !isSharePage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Create TypeScript types**

`types/database.ts`:
```typescript
export type Status = 'on_track' | 'at_risk' | 'completed'
export type Priority = 'high' | 'medium' | 'low'
export type BoardColumn = 'todo' | 'in_progress' | 'done'

export interface Company {
  id: string
  name: string
  created_at: string
  created_by: string | null
}

export interface Task {
  id: string
  company_id: string
  parent_task_id: string | null
  name: string
  responsible: string | null
  status: Status
  priority: Priority
  due_date: string | null
  followup_date: string | null
  waiting_on: string | null
  notes: string | null
  board_column: BoardColumn
  deleted_at: string | null
  asana_id: string | null
  created_at: string
  updated_at: string
  subtasks?: Task[]
}

export interface ShareLink {
  id: string
  token: string
  company_id: string | null
  label: string | null
  active: boolean
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  subscription: PushSubscriptionJSON
  created_at: string
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add database schema and Supabase client utilities"
```

---

### Task 3: Authentication — Login Page

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create login page**

`app/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await login(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create login server action**

`app/login/actions.ts`:
```typescript
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid email or password' }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Invalid email or password' }
  redirect('/')
}
```

- [ ] **Step 3: Create auth callback route**

`app/auth/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(origin)
}
```

- [ ] **Step 4: Enable email auth in Supabase**

Supabase dashboard → Authentication → Providers → Email → Enable "Confirm email" OFF for now (invite flow handles verification).

- [ ] **Step 5: Create Dani's account manually**

Supabase dashboard → Authentication → Users → Add user → daniellesilvestri@gmail.com + password.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add login page and auth callback"
```

---

## Phase 2 — Shell and Navigation

### Task 4: App Shell — Sidebar Layout

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/page.tsx`
- Create: `components/sidebar/Sidebar.tsx`
- Create: `components/sidebar/CompanyList.tsx`
- Create: `app/(app)/actions/companies.ts`

- [ ] **Step 1: Create app layout with sidebar**

`app/(app)/layout.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar companies={companies ?? []} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create Sidebar component**

`components/sidebar/Sidebar.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus } from 'lucide-react'
import type { Company } from '@/types/database'

interface Props { companies: Pick<Company, 'id' | 'name'>[] }

export default function Sidebar({ companies }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r flex flex-col h-full shrink-0">
      <div className="p-4 border-b">
        <span className="font-semibold text-gray-900">PM Tool</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${
            pathname === '/' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <LayoutGrid size={15} />
          All My Tasks
        </Link>
        <div className="mt-3 mb-1 px-3 text-xs text-gray-400 uppercase tracking-wide">Companies</div>
        {companies.map(c => (
          <Link
            key={c.id}
            href={`/company/${c.id}`}
            className={`block px-3 py-2 rounded-lg text-sm mb-0.5 ${
              pathname === `/company/${c.id}` ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Link
          href="/company/new"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg w-full"
        >
          <Plus size={14} />
          Add company
        </Link>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create home page (All My Tasks placeholder)**

`app/(app)/page.tsx`:
```typescript
export default function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">All My Tasks</h1>
      <p className="text-gray-500 text-sm">Tasks across all companies will appear here.</p>
    </div>
  )
}
```

- [ ] **Step 4: Run dev server and verify sidebar renders with login**

```bash
npm run dev
```

Open http://localhost:3000. Expected: redirect to /login. Sign in with Dani's credentials. Expected: app shell with sidebar visible, "All My Tasks" active.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add app shell with sidebar navigation"
```

---

### Task 5: Company Pages — Create and View

**Files:**
- Create: `app/(app)/company/new/page.tsx`
- Create: `app/(app)/company/[id]/page.tsx`
- Create: `app/(app)/actions/companies.ts`

- [ ] **Step 1: Create company actions**

`app/(app)/actions/companies.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CompanySchema = z.object({ name: z.string().min(1).max(100) })

export async function createCompany(formData: FormData) {
  const parsed = CompanySchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: 'Company name is required' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('companies')
    .insert({ name: parsed.data.name, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: 'Failed to create company' }
  revalidatePath('/', 'layout')
  redirect(`/company/${data.id}`)
}
```

- [ ] **Step 2: Create "Add company" page**

`app/(app)/company/new/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { createCompany } from '@/app/(app)/actions/companies'

export default function NewCompanyPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = await createCompany(new FormData(e.currentTarget))
    if (result?.error) setError(result.error)
  }

  return (
    <div className="p-6 max-w-sm">
      <h1 className="text-xl font-semibold mb-4">Add company</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Company name</label>
          <input
            name="name"
            autoFocus
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Oracle"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Create
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create company page (placeholder for now)**

`app/(app)/company/[id]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!company) notFound()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">{company.name}</h1>
      <p className="text-gray-500 text-sm">Tasks for {company.name} will appear here.</p>
    </div>
  )
}
```

- [ ] **Step 4: Verify company creation flow**

In the running dev server, click "+ Add company" → type "Oracle" → submit. Expected: redirected to Oracle's company page, Oracle appears in sidebar.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add company creation and company page"
```

---

## Phase 3 — Task Management

### Task 6: Task List View

**Files:**
- Create: `components/tasks/TaskList.tsx`
- Create: `components/tasks/TaskRow.tsx`
- Create: `components/tasks/StatusBadge.tsx`
- Create: `components/tasks/PriorityBadge.tsx`
- Modify: `app/(app)/company/[id]/page.tsx`

- [ ] **Step 1: Create StatusBadge component**

`components/tasks/StatusBadge.tsx`:
```typescript
import type { Status } from '@/types/database'

const config: Record<Status, { label: string; className: string }> = {
  on_track:  { label: 'On track',  className: 'bg-green-50 text-green-700' },
  at_risk:   { label: 'At risk',   className: 'bg-red-50 text-red-700' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-500' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Create PriorityBadge component**

`components/tasks/PriorityBadge.tsx`:
```typescript
import type { Priority } from '@/types/database'

const config: Record<Priority, { label: string; className: string }> = {
  high:   { label: 'High',   className: 'text-red-600' },
  medium: { label: 'Medium', className: 'text-yellow-600' },
  low:    { label: 'Low',    className: 'text-gray-400' },
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = config[priority]
  return <span className={`text-xs font-medium ${className}`}>{label}</span>
}
```

- [ ] **Step 3: Create TaskRow component**

`components/tasks/TaskRow.tsx`:
```typescript
'use client'
import { format } from 'date-fns'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  showCompany?: boolean
  companyName?: string
  onSelect: (task: Task) => void
}

export default function TaskRow({ task, showCompany, companyName, onSelect }: Props) {
  const isOverdue = task.due_date && !task.deleted_at &&
    task.status !== 'completed' &&
    new Date(task.due_date) < new Date()

  return (
    <button
      onClick={() => onSelect(task)}
      className={`w-full text-left grid items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-gray-50 transition-colors border-l-2 ${
        task.status === 'at_risk' ? 'border-red-400 bg-red-50/30' : 'border-transparent'
      }`}
      style={{ gridTemplateColumns: showCompany ? '2fr 1fr 1fr 90px 80px 90px' : '2fr 1fr 1fr 90px 80px' }}
    >
      <span className="font-medium text-gray-900 truncate">{task.name}</span>
      {showCompany && <span className="text-gray-500 truncate">{companyName}</span>}
      <span className="text-gray-600 truncate">{task.responsible ?? '—'}</span>
      <StatusBadge status={task.status} />
      <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
        {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
      </span>
      <span className="text-gray-500 truncate">{task.waiting_on ?? '—'}</span>
    </button>
  )
}
```

- [ ] **Step 4: Create TaskList component**

`components/tasks/TaskList.tsx`:
```typescript
'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
}

export default function TaskList({ tasks, showCompany, companies = {} }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Waiting on']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Waiting on']

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No tasks yet.</p>
        <p className="text-sm mt-1">Add your first task using the button above.</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
        style={{ gridTemplateColumns: showCompany ? '2fr 1fr 1fr 90px 80px 90px' : '2fr 1fr 1fr 90px 80px' }}
      >
        {columns.map(col => <span key={col}>{col}</span>)}
      </div>
      <div className="divide-y divide-gray-50">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            showCompany={showCompany}
            companyName={companies[task.company_id]}
            onSelect={setSelectedTask}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire TaskList into company page**

Update `app/(app)/company/[id]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TaskList from '@/components/tasks/TaskList'

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [{ data: company }, { data: tasks }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('id', params.id).single(),
    supabase.from('tasks')
      .select('*')
      .eq('company_id', params.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (!company) notFound()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
      </div>
      <TaskList tasks={tasks ?? []} />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add task list view with status and priority badges"
```

---

### Task 7: Task Side Panel

**Files:**
- Create: `components/tasks/TaskPanel.tsx`
- Create: `components/tasks/TaskPanelField.tsx`
- Modify: `components/tasks/TaskList.tsx`

- [ ] **Step 1: Create TaskPanelField component**

`components/tasks/TaskPanelField.tsx`:
```typescript
interface Props {
  label: string
  children: React.ReactNode
}

export default function TaskPanelField({ label, children }: Props) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  )
}
```

- [ ] **Step 2: Create TaskPanel component**

`components/tasks/TaskPanel.tsx`:
```typescript
'use client'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import TaskPanelField from './TaskPanelField'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task | null
  onClose: () => void
}

export default function TaskPanel({ task, onClose }: Props) {
  if (!task) return null

  return (
    <aside className="w-80 bg-white border-l h-full overflow-y-auto shrink-0 flex flex-col">
      <div className="flex items-start justify-between p-4 border-b">
        <h2 className="font-semibold text-gray-900 pr-4">{task.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X size={16} />
        </button>
      </div>
      <dl className="p-4 space-y-4 flex-1">
        <TaskPanelField label="Status">
          <StatusBadge status={task.status} />
        </TaskPanelField>
        <TaskPanelField label="Priority">
          <PriorityBadge priority={task.priority} />
        </TaskPanelField>
        <TaskPanelField label="Responsible">
          {task.responsible ?? '—'}
        </TaskPanelField>
        <TaskPanelField label="Due date">
          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
        </TaskPanelField>
        <TaskPanelField label="Follow-up date">
          {task.followup_date
            ? <span className="text-indigo-600">{format(new Date(task.followup_date), 'MMM d, yyyy')} — remind me</span>
            : '—'}
        </TaskPanelField>
        <TaskPanelField label="Waiting on">
          {task.waiting_on ?? '—'}
        </TaskPanelField>
        {task.notes && (
          <TaskPanelField label="Notes">
            <p className="whitespace-pre-wrap text-gray-700">{task.notes}</p>
          </TaskPanelField>
        )}
      </dl>
    </aside>
  )
}
```

- [ ] **Step 3: Wire panel into TaskList**

Update `components/tasks/TaskList.tsx` — add panel alongside list:
```typescript
'use client'
import { useState } from 'react'
import TaskRow from './TaskRow'
import TaskPanel from './TaskPanel'
import type { Task } from '@/types/database'

interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
}

export default function TaskList({ tasks, showCompany, companies = {} }: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Waiting on']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Waiting on']

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No tasks yet.</p>
            <p className="text-sm mt-1">Add your first task using the button above.</p>
          </div>
        ) : (
          <>
            <div
              className="grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{ gridTemplateColumns: showCompany ? '2fr 1fr 1fr 90px 80px 90px' : '2fr 1fr 1fr 90px 80px' }}
            >
              {columns.map(col => <span key={col}>{col}</span>)}
            </div>
            <div className="divide-y divide-gray-50">
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showCompany={showCompany}
                  companyName={companies[task.company_id]}
                  onSelect={setSelectedTask}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )
}
```

- [ ] **Step 4: Verify panel opens on task click**

Click a task row. Expected: side panel slides in on the right with all task fields. X button closes it. Task list stays visible alongside.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add task side panel"
```

---

### Task 8: Add and Edit Tasks

**Files:**
- Create: `components/tasks/TaskForm.tsx`
- Create: `app/(app)/actions/tasks.ts`
- Modify: `app/(app)/company/[id]/page.tsx`
- Modify: `components/tasks/TaskPanel.tsx`

- [ ] **Step 1: Create task server actions**

`app/(app)/actions/tasks.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaskSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1).max(500),
  responsible: z.string().optional(),
  status: z.enum(['on_track', 'at_risk', 'completed']).default('on_track'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  due_date: z.string().optional().nullable(),
  followup_date: z.string().optional().nullable(),
  waiting_on: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  board_column: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  parent_task_id: z.string().uuid().optional().nullable(),
})

export async function createTask(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = TaskSchema.safeParse({
    ...raw,
    due_date: raw.due_date || null,
    followup_date: raw.followup_date || null,
    waiting_on: raw.waiting_on || null,
    notes: raw.notes || null,
    parent_task_id: raw.parent_task_id || null,
  })
  if (!parsed.success) return { error: 'Invalid task data' }

  const supabase = createClient()
  const { error } = await supabase.from('tasks').insert(parsed.data)
  if (error) return { error: 'Failed to create task' }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateTask(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = TaskSchema.partial().safeParse({
    ...raw,
    due_date: raw.due_date || null,
    followup_date: raw.followup_date || null,
    waiting_on: raw.waiting_on || null,
    notes: raw.notes || null,
  })
  if (!parsed.success) return { error: 'Invalid task data' }

  const supabase = createClient()
  const { error } = await supabase.from('tasks').update(parsed.data).eq('id', id)
  if (error) return { error: 'Failed to update task' }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function softDeleteTask(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: 'Failed to delete task' }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function restoreTask(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) return { error: 'Failed to restore task' }
  revalidatePath('/', 'layout')
  return { success: true }
}
```

- [ ] **Step 2: Create TaskForm component**

`components/tasks/TaskForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { Task, Status, Priority } from '@/types/database'

interface Props {
  companyId: string
  task?: Task
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean } | undefined>
  onCancel: () => void
}

export default function TaskForm({ companyId, task, onSubmit, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('company_id', companyId)
    const result = await onSubmit(fd)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  const field = (label: string, name: string, type = 'text', defaultValue?: string) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )

  const select = (label: string, name: string, options: string[], defaultValue?: string) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
      </select>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {field('Task name *', 'name', 'text', task?.name)}
      {field('Responsible', 'responsible', 'text', task?.responsible ?? '')}
      {select('Status', 'status', ['on_track', 'at_risk', 'completed'], task?.status ?? 'on_track')}
      {select('Priority', 'priority', ['high', 'medium', 'low'], task?.priority ?? 'medium')}
      {field('Due date', 'due_date', 'date', task?.due_date ?? '')}
      {field('Follow-up date', 'followup_date', 'date', task?.followup_date ?? '')}
      {field('Waiting on', 'waiting_on', 'text', task?.waiting_on ?? '')}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={task?.notes ?? ''}
          rows={3}
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : (task ? 'Save changes' : 'Add task')}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-2">
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Add "Add task" button to company page**

Update `app/(app)/company/[id]/page.tsx` to pass a new task trigger:
```typescript
// Add to imports
import AddTaskButton from '@/components/tasks/AddTaskButton'

// Add below the h1
<AddTaskButton companyId={company.id} />
```

Create `components/tasks/AddTaskButton.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import TaskForm from './TaskForm'
import { createTask } from '@/app/(app)/actions/tasks'

export default function AddTaskButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <div className="bg-white border rounded-xl p-4 mb-4">
        <h3 className="font-medium text-sm mb-3">New task</h3>
        <TaskForm
          companyId={companyId}
          onSubmit={async (fd) => {
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
      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mb-4"
    >
      <Plus size={14} />
      Add task
    </button>
  )
}
```

- [ ] **Step 4: Add edit mode to TaskPanel**

Update `components/tasks/TaskPanel.tsx` to add an Edit button that swaps to TaskForm:
```typescript
// Add to imports
import { useState } from 'react'
import { X, Pencil } from 'lucide-react'
import TaskForm from './TaskForm'
import { updateTask } from '@/app/(app)/actions/tasks'

// Inside component, add state:
const [editing, setEditing] = useState(false)

// In header, add edit button next to X:
<button onClick={() => setEditing(!editing)} className="text-gray-400 hover:text-gray-600">
  <Pencil size={14} />
</button>

// Replace dl with conditional:
{editing ? (
  <div className="p-4">
    <TaskForm
      companyId={task.company_id}
      task={task}
      onSubmit={async (fd) => {
        const result = await updateTask(task.id, fd)
        if (result?.success) setEditing(false)
        return result
      }}
      onCancel={() => setEditing(false)}
    />
  </div>
) : (
  <dl className="p-4 space-y-4 flex-1">
    {/* existing fields */}
  </dl>
)}
```

- [ ] **Step 5: Verify add and edit flows**

Add a task to Oracle. Expected: task appears in list immediately. Click task → pencil icon → edit form → save. Expected: updated values appear in panel.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add task creation and editing"
```

---

### Task 9: Soft Delete with Undo Toast

**Files:**
- Create: `components/ui/Toast.tsx`
- Create: `components/ui/ToastProvider.tsx`
- Modify: `components/tasks/TaskPanel.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create Toast system**

`components/ui/Toast.tsx`:
```typescript
'use client'
import { useEffect } from 'react'

interface Props {
  message: string
  onUndo?: () => void
  onDismiss: () => void
}

export default function Toast({ message, onUndo, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl flex items-center gap-4 shadow-lg z-50">
      <span>{message}</span>
      {onUndo && (
        <button onClick={onUndo} className="font-semibold text-indigo-300 hover:text-indigo-100">
          Undo
        </button>
      )}
      <button onClick={onDismiss} className="text-gray-400 hover:text-white">✕</button>
    </div>
  )
}
```

- [ ] **Step 2: Add delete button to TaskPanel with undo**

In `components/tasks/TaskPanel.tsx`, import and use the delete action:
```typescript
import { softDeleteTask, restoreTask } from '@/app/(app)/actions/tasks'
import Toast from '@/components/ui/Toast'

// Add state
const [toast, setToast] = useState<{ taskId: string } | null>(null)

// Add delete button in panel footer
<div className="p-4 border-t">
  <button
    onClick={async () => {
      await softDeleteTask(task.id)
      setToast({ taskId: task.id })
      onClose()
    }}
    className="text-sm text-red-500 hover:text-red-700"
  >
    Delete task
  </button>
</div>

// Add toast
{toast && (
  <Toast
    message="Task deleted"
    onUndo={async () => {
      await restoreTask(toast.taskId)
      setToast(null)
    }}
    onDismiss={() => setToast(null)}
  />
)}
```

- [ ] **Step 3: Verify delete with undo**

Delete a task. Expected: task disappears, toast appears with "Undo". Click Undo. Expected: task reappears.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add soft delete with undo toast"
```

---

### Task 10: Board View

**Files:**
- Create: `components/tasks/TaskBoard.tsx`
- Create: `components/tasks/BoardCard.tsx`
- Create: `components/tasks/ViewToggle.tsx`
- Modify: `app/(app)/company/[id]/page.tsx`
- Modify: `app/(app)/actions/tasks.ts`

- [ ] **Step 1: Add updateBoardColumn action**

In `app/(app)/actions/tasks.ts`, add:
```typescript
export async function updateBoardColumn(id: string, column: BoardColumn) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ board_column: column })
    .eq('id', id)
  if (error) return { error: 'Failed to move task' }
  revalidatePath('/', 'layout')
  return { success: true }
}
```

- [ ] **Step 2: Create ViewToggle component**

`components/tasks/ViewToggle.tsx`:
```typescript
'use client'
import { List, LayoutGrid } from 'lucide-react'

interface Props {
  view: 'list' | 'board'
  onChange: (v: 'list' | 'board') => void
}

export default function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex border rounded-lg overflow-hidden">
      {(['list', 'board'] as const).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
            view === v ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {v === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create BoardCard component**

`components/tasks/BoardCard.tsx`:
```typescript
'use client'
import StatusBadge from './StatusBadge'
import type { Task } from '@/types/database'

interface Props {
  task: Task
  onSelect: (task: Task) => void
}

export default function BoardCard({ task, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(task)}
      className="w-full text-left bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{task.name}</p>
      <div className="flex items-center justify-between">
        <StatusBadge status={task.status} />
        {task.responsible && (
          <span className="text-xs text-gray-500">{task.responsible}</span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Create TaskBoard component**

`components/tasks/TaskBoard.tsx`:
```typescript
'use client'
import { useState } from 'react'
import BoardCard from './BoardCard'
import TaskPanel from './TaskPanel'
import { updateBoardColumn } from '@/app/(app)/actions/tasks'
import type { Task, BoardColumn } from '@/types/database'

const COLUMNS: { key: BoardColumn; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

export default function TaskBoard({ tasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const tasksByColumn = (col: BoardColumn) =>
    tasks.filter(t => t.board_column === col)

  return (
    <div className="flex gap-4 h-full">
      <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div key={col.key} className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">{col.label}</h3>
              <span className="text-xs text-gray-400">{tasksByColumn(col.key).length}</span>
            </div>
            <div className="space-y-2 min-h-[100px] bg-gray-50 rounded-xl p-2">
              {tasksByColumn(col.key).map(task => (
                <BoardCard key={task.id} task={task} onSelect={setSelectedTask} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )
}
```

- [ ] **Step 5: Wire view toggle into company page**

Update `app/(app)/company/[id]/page.tsx`:
```typescript
// Make it a client component wrapper that holds view state
// Create app/(app)/company/[id]/CompanyView.tsx as client component
// CompanyPage remains server, passes data to CompanyView
```

Create `app/(app)/company/[id]/CompanyView.tsx`:
```typescript
'use client'
import { useState } from 'react'
import TaskList from '@/components/tasks/TaskList'
import TaskBoard from '@/components/tasks/TaskBoard'
import ViewToggle from '@/components/tasks/ViewToggle'
import AddTaskButton from '@/components/tasks/AddTaskButton'
import type { Task } from '@/types/database'

interface Props {
  companyId: string
  companyName: string
  tasks: Task[]
}

export default function CompanyView({ companyId, companyName, tasks }: Props) {
  const [view, setView] = useState<'list' | 'board'>('list')

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{companyName}</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <AddTaskButton companyId={companyId} />
      <div className="flex-1 overflow-auto">
        {view === 'list'
          ? <TaskList tasks={tasks} />
          : <TaskBoard tasks={tasks} />
        }
      </div>
    </div>
  )
}
```

Update `app/(app)/company/[id]/page.tsx` to use CompanyView:
```typescript
import CompanyView from './CompanyView'
// ... same data fetching, replace JSX:
return <CompanyView companyId={company.id} companyName={company.name} tasks={tasks ?? []} />
```

- [ ] **Step 6: Verify board view**

Toggle to board view. Expected: tasks appear in three columns. Click a card. Expected: side panel opens.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add board view with list/board toggle"
```

---

## Phase 4 — Advanced Features

### Task 11: All My Tasks View

**Files:**
- Create: `app/(app)/AllTasksView.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Build All My Tasks page**

`app/(app)/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import AllTasksView from './AllTasksView'

export default async function HomePage() {
  const supabase = createClient()
  const [{ data: tasks }, { data: companies }] = await Promise.all([
    supabase.from('tasks')
      .select('*')
      .is('deleted_at', null)
      .is('parent_task_id', null)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('companies').select('id, name'),
  ])

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return <AllTasksView tasks={tasks ?? []} companies={companyMap} />
}
```

`app/(app)/AllTasksView.tsx`:
```typescript
'use client'
import { useState } from 'react'
import TaskList from '@/components/tasks/TaskList'

interface Props {
  tasks: any[]
  companies: Record<string, string>
}

export default function AllTasksView({ tasks, companies }: Props) {
  return (
    <div className="p-6 flex flex-col h-full">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">All My Tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">No open tasks across any company.</p>
      ) : (
        <TaskList tasks={tasks} showCompany companies={companies} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify All My Tasks**

Click "All My Tasks" in sidebar. Expected: tasks from all companies shown in one list with Company column visible.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add All My Tasks cross-company view"
```

---

### Task 12: Filtering and Sorting

**Files:**
- Create: `components/tasks/FilterBar.tsx`
- Modify: `components/tasks/TaskList.tsx`
- Modify: `app/(app)/company/[id]/CompanyView.tsx`
- Modify: `app/(app)/AllTasksView.tsx`

- [ ] **Step 1: Create FilterBar component**

`components/tasks/FilterBar.tsx`:
```typescript
'use client'
import type { Status, Priority } from '@/types/database'

interface Filters {
  status: Status | ''
  priority: Priority | ''
  responsible: string
  sortBy: 'due_date' | 'priority' | 'status' | 'created_at'
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FilterBar({ filters, onChange }: Props) {
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value })

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select value={filters.status} onChange={set('status')}
        className="border rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="">All statuses</option>
        <option value="on_track">On track</option>
        <option value="at_risk">At risk</option>
        <option value="completed">Completed</option>
      </select>
      <select value={filters.priority} onChange={set('priority')}
        className="border rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <input
        value={filters.responsible}
        onChange={set('responsible')}
        placeholder="Filter by person…"
        className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
      />
      <select value={filters.sortBy} onChange={set('sortBy')}
        className="border rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="due_date">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
        <option value="status">Sort: Status</option>
        <option value="created_at">Sort: Newest</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Apply filters in TaskList**

Update `components/tasks/TaskList.tsx` to accept and apply filters client-side:
```typescript
// Add props
interface Props {
  tasks: Task[]
  showCompany?: boolean
  companies?: Record<string, string>
  filters?: { status: string; priority: string; responsible: string; sortBy: string }
}

// Apply filtering before rendering
const priorityOrder = { high: 0, medium: 1, low: 2 }
const statusOrder = { at_risk: 0, on_track: 1, completed: 2 }

const filtered = (filters ? tasks.filter(t =>
  (!filters.status || t.status === filters.status) &&
  (!filters.priority || t.priority === filters.priority) &&
  (!filters.responsible || t.responsible?.toLowerCase().includes(filters.responsible.toLowerCase()))
) : tasks).sort((a, b) => {
  if (!filters) return 0
  if (filters.sortBy === 'due_date') {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  }
  if (filters.sortBy === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority]
  if (filters.sortBy === 'status') return statusOrder[a.status] - statusOrder[b.status]
  return b.created_at.localeCompare(a.created_at)
})
// Use `filtered` instead of `tasks` in the render
```

- [ ] **Step 3: Wire FilterBar into CompanyView and AllTasksView**

```typescript
// In CompanyView.tsx
const [filters, setFilters] = useState({ status: '', priority: '', responsible: '', sortBy: 'due_date' })
// Add <FilterBar filters={filters} onChange={setFilters} /> above TaskList
// Pass filters to TaskList
```

- [ ] **Step 4: Add search bar**

Add a search input above FilterBar in both views:
```typescript
const [search, setSearch] = useState('')
// Filter tasks: add && (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.notes?.toLowerCase().includes(search.toLowerCase()) || t.responsible?.toLowerCase().includes(search.toLowerCase()))
// Add search input:
<input
  value={search}
  onChange={e => setSearch(e.target.value)}
  placeholder="Search tasks…"
  className="border rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
/>
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add filtering, sorting, and search"
```

---

### Task 13: Follow-up Date Push Notifications

**Files:**
- Create: `public/sw.js`
- Create: `app/api/push/subscribe/route.ts`
- Create: `app/api/push/send/route.ts`
- Create: `lib/push.ts`
- Create: `components/notifications/PushPermission.tsx`
- Create: `app/api/cron/followup-reminders/route.ts`

- [ ] **Step 1: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy both keys into `.env.local` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

- [ ] **Step 2: Create service worker**

`public/sw.js`:
```javascript
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'PM Tool', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
```

- [ ] **Step 3: Create push utility**

`lib/push.ts`:
```typescript
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_CONTACT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: { title: string; body: string; url?: string }
) {
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify(payload)
  )
}
```

- [ ] **Step 4: Create subscribe API route**

`app/api/push/subscribe/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await req.json()
  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    subscription,
  }, { onConflict: 'user_id, (subscription->>\'endpoint\')' })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Create follow-up reminder cron route**

`app/api/cron/followup-reminders/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push'
import { format } from 'date-fns'

// Called daily by Vercel Cron
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, name, company_id')
    .eq('followup_date', today)
    .is('deleted_at', null)
    .neq('status', 'completed')

  if (!tasks?.length) return NextResponse.json({ sent: 0 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')

  let sent = 0
  for (const task of tasks) {
    for (const sub of (subs ?? [])) {
      try {
        await sendPushNotification(sub.subscription, {
          title: 'Follow-up reminder',
          body: task.name,
        })
        sent++
      } catch {}
    }
  }

  return NextResponse.json({ sent })
}
```

Add `CRON_SECRET` to `.env.local` (any random string). Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/followup-reminders", "schedule": "0 9 * * *" }]
}
```

- [ ] **Step 6: Create PushPermission component**

`components/notifications/PushPermission.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'

export default function PushPermission() {
  const [status, setStatus] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus(Notification.permission)
  }, [])

  async function enable() {
    const permission = await Notification.requestPermission()
    setStatus(permission)
    if (permission !== 'granted') return

    const reg = await navigator.serviceWorker.register('/sw.js')
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
  }

  if (status === 'granted' || status === 'unsupported') return null

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 flex items-center justify-between">
      <p className="text-sm text-indigo-800">Enable phone notifications to get follow-up reminders.</p>
      <button
        onClick={enable}
        className="text-sm font-medium text-indigo-700 hover:text-indigo-900 ml-4 shrink-0"
      >
        Enable
      </button>
    </div>
  )
}
```

Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to `.env.local` (same value as `VAPID_PUBLIC_KEY`).

Add `<PushPermission />` to `app/(app)/layout.tsx` inside the main content area.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add push notification system for follow-up reminders"
```

---

### Task 14: Subtasks

**Files:**
- Modify: `components/tasks/TaskPanel.tsx`
- Modify: `app/(app)/actions/tasks.ts`
- Create: `components/tasks/SubtaskList.tsx`

- [ ] **Step 1: Create SubtaskList component**

`components/tasks/SubtaskList.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { createTask, updateTask } from '@/app/(app)/actions/tasks'
import type { Task } from '@/types/database'

interface Props {
  parentTask: Task
  subtasks: Task[]
}

export default function SubtaskList({ parentTask, subtasks }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  async function handleAdd() {
    if (!name.trim()) return
    const fd = new FormData()
    fd.set('name', name)
    fd.set('company_id', parentTask.company_id)
    fd.set('parent_task_id', parentTask.id)
    await createTask(fd)
    setName('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Subtasks ({subtasks.length})
        </span>
        <button onClick={() => setAdding(true)} className="text-xs text-indigo-600 hover:text-indigo-800">
          <Plus size={12} className="inline" /> Add
        </button>
      </div>
      <div className="space-y-1">
        {subtasks.map(sub => (
          <div key={sub.id} className="flex items-center gap-2 text-sm">
            <button
              onClick={async () => {
                const fd = new FormData()
                fd.set('status', sub.status === 'completed' ? 'on_track' : 'completed')
                await updateTask(sub.id, fd)
              }}
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                sub.status === 'completed' ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
              }`}
            >
              {sub.status === 'completed' && <Check size={10} className="text-white" />}
            </button>
            <span className={sub.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}>
              {sub.name}
            </span>
          </div>
        ))}
      </div>
      {adding && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Subtask name…"
            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button onClick={handleAdd} className="text-xs text-indigo-600 font-medium">Add</button>
          <button onClick={() => setAdding(false)} className="text-xs text-gray-400">Cancel</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Load subtasks in TaskPanel**

TaskPanel receives subtasks via props. Update its parent (TaskList/TaskBoard) to pass subtasks. Subtasks are already loaded in company page query (`*` select). Filter them:

```typescript
const subtasks = allTasks.filter(t => t.parent_task_id === selectedTask?.id)
// Pass to TaskPanel: <TaskPanel task={selectedTask} subtasks={subtasks} onClose={...} />
```

- [ ] **Step 3: Render SubtaskList in panel**

In `components/tasks/TaskPanel.tsx`, add after Notes field:
```typescript
import SubtaskList from './SubtaskList'
// In dl:
<div>
  <SubtaskList parentTask={task} subtasks={subtasks} />
</div>
```

- [ ] **Step 4: Show subtask count badge in TaskRow**

In `components/tasks/TaskRow.tsx`:
```typescript
// Add subtaskCount prop
// In task name cell:
<span className="font-medium text-gray-900 truncate">{task.name}</span>
{subtaskCount > 0 && (
  <span className="text-xs text-gray-400 ml-1">({subtaskCount})</span>
)}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add subtasks with inline add and completion toggle"
```

---

## Phase 5 — Data and Sharing

### Task 15: Asana CSV Import

**Files:**
- Create: `app/(app)/import/page.tsx`
- Create: `app/(app)/actions/import.ts`
- Create: `lib/asana-parser.ts`

- [ ] **Step 1: Create Asana CSV parser**

`lib/asana-parser.ts`:
```typescript
import Papa from 'papaparse'
import type { Task, Status, Priority } from '@/types/database'

interface AsanaRow {
  'Task ID': string
  'Name': string
  'Assignee': string
  'Responsibility'?: string
  'Due Date': string
  'Start Date'?: string
  'Status'?: string
  'Priority'?: string
  'Waiting On'?: string
  'Notes'?: string
  'Parent task'?: string
  'Projects'?: string
}

function mapStatus(raw: string | undefined): Status {
  if (!raw) return 'on_track'
  const v = raw.toLowerCase()
  if (v.includes('risk')) return 'at_risk'
  if (v.includes('complete') || v.includes('done')) return 'completed'
  return 'on_track'
}

function mapPriority(raw: string | undefined): Priority {
  if (!raw) return 'medium'
  const v = raw.toLowerCase()
  if (v === 'high') return 'high'
  if (v === 'low') return 'low'
  return 'medium'
}

export interface ParsedTask {
  asana_id: string
  name: string
  responsible: string | null
  status: Status
  priority: Priority
  due_date: string | null
  waiting_on: string | null
  notes: string | null
  parent_asana_id: string | null
}

export function parseAsanaCSV(csvText: string): ParsedTask[] {
  const { data } = Papa.parse<AsanaRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  return data
    .filter(row => row['Name']?.trim())
    .map(row => ({
      asana_id: row['Task ID'],
      name: row['Name'].trim(),
      responsible: row['Responsibility'] || row['Assignee'] || null,
      status: mapStatus(row['Status']),
      priority: mapPriority(row['Priority']),
      due_date: row['Due Date'] || null,
      waiting_on: row['Waiting On'] || null,
      notes: row['Notes'] || null,
      parent_asana_id: row['Parent task'] || null,
    }))
}
```

- [ ] **Step 2: Create import action**

`app/(app)/actions/import.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseAsanaCSV } from '@/lib/asana-parser'
import { z } from 'zod'

const ImportSchema = z.object({
  company_id: z.string().uuid(),
  csv: z.string().min(1),
})

export async function importAsanaCSV(formData: FormData) {
  const parsed = ImportSchema.safeParse({
    company_id: formData.get('company_id'),
    csv: formData.get('csv'),
  })
  if (!parsed.success) return { error: 'Missing company or CSV data' }

  const tasks = parseAsanaCSV(parsed.data.csv)
  if (!tasks.length) return { error: 'No tasks found in CSV' }

  const supabase = createClient()

  // Insert parent tasks first
  const parents = tasks.filter(t => !t.parent_asana_id)
  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert(parents.map(t => ({ ...t, company_id: parsed.data.company_id, parent_asana_id: undefined })))
    .select('id, asana_id')

  if (error) return { error: 'Import failed: ' + error.message }

  // Build asana_id → db_id map
  const idMap = Object.fromEntries((inserted ?? []).map(r => [r.asana_id, r.id]))

  // Insert subtasks
  const children = tasks.filter(t => t.parent_asana_id && idMap[t.parent_asana_id])
  if (children.length) {
    await supabase.from('tasks').insert(
      children.map(t => ({
        ...t,
        company_id: parsed.data.company_id,
        parent_task_id: idMap[t.parent_asana_id!],
        parent_asana_id: undefined,
      }))
    )
  }

  revalidatePath('/', 'layout')
  return { success: true, count: tasks.length }
}
```

- [ ] **Step 3: Create import page**

`app/(app)/import/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { importAsanaCSV } from '@/app/(app)/actions/import'

export default function ImportPage() {
  const [result, setResult] = useState<{ error?: string; success?: boolean; count?: number } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const file = fd.get('file') as File
    const csv = await file.text()
    fd.set('csv', csv)
    const res = await importAsanaCSV(fd)
    setResult(res ?? null)
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-semibold mb-2">Import from Asana</h1>
      <p className="text-sm text-gray-500 mb-6">
        Export a project from Asana as CSV (Project → Export → CSV), then upload it here.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Company</label>
          <select name="company_id" required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select a company…</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Asana CSV file</label>
          <input type="file" name="file" accept=".csv" required
            className="w-full text-sm text-gray-700" />
        </div>
        {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
        {result?.success && <p className="text-sm text-green-600">Imported {result.count} tasks.</p>}
        <button type="submit" disabled={loading}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Importing…' : 'Import'}
        </button>
      </form>
    </div>
  )
}
```

Add import page link to sidebar (below "+ Add company"):
```typescript
<Link href="/import" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
  <Upload size={14} />
  Import from Asana
</Link>
```

- [ ] **Step 4: Populate company dropdown in import page**

Import page needs company list. Make it a server component wrapper:
```typescript
// Create app/(app)/import/ImportView.tsx (client) + page.tsx (server that fetches companies and passes to ImportView)
```

- [ ] **Step 5: Test import with Dani's real CSV**

Upload one of Dani's Asana CSV exports. Expected: tasks appear in the selected company view with correct statuses, responsible people, and due dates.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Asana CSV import with parent/subtask resolution"
```

---

### Task 16: CSV Export

**Files:**
- Create: `app/api/export/[companyId]/route.ts`
- Modify: `app/(app)/company/[id]/CompanyView.tsx`

- [ ] **Step 1: Create export API route**

`app/api/export/[companyId]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export async function GET(_: Request, { params }: { params: { companyId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('company_id', params.companyId)
    .is('deleted_at', null)
    .order('created_at')

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', params.companyId)
    .single()

  const csv = Papa.unparse((tasks ?? []).map(t => ({
    'Task name': t.name,
    'Responsible': t.responsible ?? '',
    'Status': t.status,
    'Priority': t.priority,
    'Due date': t.due_date ?? '',
    'Follow-up date': t.followup_date ?? '',
    'Waiting on': t.waiting_on ?? '',
    'Notes': t.notes ?? '',
    'Created at': t.created_at,
  })))

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${company?.name ?? 'tasks'}-export.csv"`,
    },
  })
}
```

- [ ] **Step 2: Add export button to company page header**

In `CompanyView.tsx`:
```typescript
<a
  href={`/api/export/${companyId}`}
  className="text-sm text-gray-500 hover:text-gray-700"
>
  Export CSV
</a>
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add CSV export per company"
```

---

### Task 17: Shared View-Only Links

**Files:**
- Create: `app/share/[token]/page.tsx`
- Create: `app/(app)/settings/page.tsx`
- Create: `app/(app)/actions/sharelinks.ts`

- [ ] **Step 1: Create share link actions**

`app/(app)/actions/sharelinks.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createShareLink(companyId: string | null, label: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('share_links')
    .insert({ company_id: companyId, label })
    .select('token')
    .single()
  if (error) return { error: 'Failed to create link' }
  revalidatePath('/settings')
  return { token: data.token }
}

export async function deactivateShareLink(id: string) {
  const supabase = createClient()
  await supabase.from('share_links').update({ active: false }).eq('id', id)
  revalidatePath('/settings')
}
```

- [ ] **Step 2: Create shared view page (public, no auth)**

`app/share/[token]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: link } = await supabase
    .from('share_links')
    .select('company_id, label, active')
    .eq('token', params.token)
    .single()

  if (!link || !link.active) notFound()

  const query = supabase.from('tasks').select('*').is('deleted_at', null).neq('status', 'completed')
  if (link.company_id) query.eq('company_id', link.company_id)

  const { data: tasks } = await query.order('due_date', { ascending: true, nullsFirst: false })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-1">{link.label ?? 'Project tasks'}</h1>
        <p className="text-sm text-gray-500 mb-6">View only</p>
        <div className="bg-white rounded-xl border overflow-hidden">
          {(tasks ?? []).map(task => (
            <div key={task.id} className="flex items-center gap-4 px-4 py-3 border-b last:border-0 text-sm">
              <span className="flex-1 font-medium">{task.name}</span>
              <span className="text-gray-500">{task.responsible ?? '—'}</span>
              <span className={task.status === 'at_risk' ? 'text-red-600 font-medium' : 'text-green-600'}>
                {task.status === 'at_risk' ? 'At risk' : task.status === 'completed' ? 'Done' : 'On track'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add service role client for public share route**

The share page uses anon client but needs to bypass RLS for public access. Add a Supabase policy:

```sql
-- In Supabase SQL Editor:
create policy "public share link read" on tasks
  for select to anon
  using (
    exists (
      select 1 from share_links
      where active = true
      and (company_id = tasks.company_id or company_id is null)
    )
  );

create policy "public share link read" on share_links
  for select to anon using (active = true);
```

- [ ] **Step 4: Create settings page for managing links**

`app/(app)/settings/page.tsx`:
```typescript
// Server component that lists all share links with copy/deactivate buttons
// Full implementation inline (client component for copy-to-clipboard interaction)
```

- [ ] **Step 5: Add Settings link to sidebar**

```typescript
<Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
  <Settings size={14} />
  Settings & links
</Link>
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add shared view-only links per company"
```

---

### Task 18: Mike's Invite Flow

**Files:**
- Create: `app/(app)/settings/InviteSection.tsx`
- Create: `app/api/invite/route.ts`

- [ ] **Step 1: Create invite API**

`app/api/invite/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Use Supabase Admin to invite user
  const adminClient = createAdminClient() // uses service role key
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

Create `lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 2: Add invite UI to settings page**

`app/(app)/settings/InviteSection.tsx`:
```typescript
'use client'
import { useState } from 'react'

export default function InviteSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  async function sendInvite() {
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setStatus(res.ok ? 'sent' : 'error')
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Invite a collaborator</h2>
      <p className="text-sm text-gray-500 mb-3">
        They'll receive an email to set a password and get full edit access.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={sendInvite}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Send invite
        </button>
      </div>
      {status === 'sent' && <p className="text-sm text-green-600 mt-2">Invite sent.</p>}
      {status === 'error' && <p className="text-sm text-red-600 mt-2">Failed to send. Try again.</p>}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Mike invite flow via Supabase admin"
```

---

## Phase 6 — Mobile and Polish

### Task 19: Mobile Responsive Layout

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/sidebar/Sidebar.tsx`
- Modify: `components/tasks/TaskPanel.tsx`
- Modify: `components/tasks/TaskList.tsx`

- [ ] **Step 1: Make sidebar collapsible on mobile**

Add hamburger menu button that toggles sidebar visibility on small screens. Use Tailwind `md:` breakpoints:

```typescript
// Sidebar: add `hidden md:flex` by default, show when open
// AppLayout: track `sidebarOpen` state, pass to Sidebar
// Add hamburger button in a mobile header bar (visible only on small screens)
```

- [ ] **Step 2: Make TaskPanel full-screen on mobile**

On mobile (<768px), side panel should overlay the full screen rather than sitting beside the list:
```typescript
// TaskPanel: add `md:w-80 w-full md:relative fixed inset-0 z-40` conditionally
// Add close button prominently at top on mobile
```

- [ ] **Step 3: Simplify TaskRow on mobile**

On small screens, show only task name and status. Hide other columns:
```typescript
// Use hidden/md:grid for column headers
// Task name always visible, other fields hidden on xs with Tailwind classes
```

- [ ] **Step 4: Test on mobile viewport**

In Chrome DevTools, test at 375px (iPhone SE) and 390px (iPhone 14). Verify: sidebar collapses, tasks readable, panel opens full screen, add task form works.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: responsive mobile layout with collapsible sidebar"
```

---

### Task 20: Trash View (30-day soft delete)

**Files:**
- Create: `app/(app)/trash/page.tsx`
- Create: `app/(app)/actions/trash.ts`
- Modify: `components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Create trash action**

`app/(app)/actions/trash.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function permanentlyDeleteExpired() {
  const supabase = createClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('tasks').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff)
  revalidatePath('/')
}
```

- [ ] **Step 2: Create trash page**

`app/(app)/trash/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { restoreTask } from '@/app/(app)/actions/tasks'

export default async function TrashPage() {
  const supabase = createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, name, company_id, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-2">Trash</h1>
      <p className="text-sm text-gray-400 mb-6">Tasks are permanently deleted after 30 days.</p>
      {(!tasks || tasks.length === 0) ? (
        <p className="text-sm text-gray-400">Trash is empty.</p>
      ) : tasks.map(task => (
        <div key={task.id} className="flex items-center justify-between py-3 border-b text-sm">
          <span className="text-gray-700">{task.name}</span>
          <form action={async () => { 'use server'; await restoreTask(task.id) }}>
            <button type="submit" className="text-indigo-600 hover:text-indigo-800 text-xs">Restore</button>
          </form>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add Trash link to sidebar bottom**

```typescript
<Link href="/trash" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-100 rounded-lg">
  <Trash2 size={14} />
  Trash
</Link>
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add trash view with 30-day soft delete"
```

---

## Phase 7 — Deployment

### Task 21: Deploy to Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Push to GitHub**

```bash
gh repo create pm-tool --private
git remote add origin https://github.com/daniellesilvestri/pm-tool.git
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

Go to vercel.com → New Project → Import from GitHub → select pm-tool.

- [ ] **Step 3: Add environment variables**

In Vercel project settings → Environment Variables, add all values from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_CONTACT`
- `CRON_SECRET`

- [ ] **Step 4: Add Supabase redirect URL**

Supabase dashboard → Authentication → URL Configuration → Add redirect URL: `https://your-vercel-url.vercel.app/auth/callback`

- [ ] **Step 5: Deploy and verify**

Vercel will auto-deploy on push. Visit the production URL. Expected: login page loads, sign in works, companies and tasks load, push notifications prompt appears.

- [ ] **Step 6: Set up cron in Vercel**

Add `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/followup-reminders", "schedule": "0 9 * * *" }]
}
```

Deploy. Cron runs daily at 9am UTC — adjust `schedule` for Dani's timezone.

- [ ] **Step 7: Final commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron schedule for follow-up reminders"
git push
```

---

## Self-Review — Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Sidebar navigation | Task 4 |
| All My Tasks view | Task 11 |
| Per-company views | Task 5 |
| List + board toggle | Task 6, 10 |
| All task fields visible | Task 6 |
| Side panel on click | Task 7 |
| Add/edit tasks | Task 8 |
| Follow-up date + push notification | Task 13 |
| Sorting, filtering, search | Task 12 |
| Subtasks | Task 14 |
| Asana CSV import | Task 15 |
| CSV export | Task 16 |
| Shared view-only links | Task 17 |
| Mike invite flow | Task 18 |
| Soft delete + trash | Task 9, 20 |
| Mobile responsive | Task 19 |
| Empty states | Task 6 (TaskList empty state) |
| Undo for deletes | Task 9 |
| Deploy | Task 21 |
