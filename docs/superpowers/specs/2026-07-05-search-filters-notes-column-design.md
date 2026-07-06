# Search, Filters, and Notes Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move search into the page header on All Tasks and company pages; add a company filter to the filter bar on All Tasks; add an inline-editable notes column to the task list on company pages.

**Architecture:** FilterBar and its filter logic already exist in `TaskList.tsx` and are wired into both pages. Three changes needed: (1) lift search out of FilterBar into page headers (AllTasksView, CompanyView); (2) add company filter dropdown to FilterBar on All Tasks; (3) add notes column to task list with inline editing. All filtering is client-side.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Supabase SSR. `notes text` column already exists in the `tasks` table. No DB migration needed.

---

## What's already built (do not re-implement)

- `components/tasks/FilterBar.tsx` — filter UI with search, status, priority, responsible, sort
- `components/tasks/TaskList.tsx` — already imports and renders FilterBar with full filter/sort logic
- `notes` field — already in `Task` type, `tasks` DB table, `TaskForm`, and read-only display in `TaskPanel`
- `updateTask` server action — already handles `notes` field

---

## Scope

### Task 1: Move search to page headers

Search moves out of FilterBar and into the header row of each page, alongside the page title and controls.

**Files:**
- Modify: `components/tasks/FilterBar.tsx`
- Modify: `components/tasks/TaskList.tsx`
- Modify: `app/(app)/tasks/AllTasksView.tsx`
- Modify: `app/(app)/company/[id]/CompanyView.tsx`

**FilterBar changes:**
- Remove the `search` input and `search` field from the `Filters` interface and `defaultFilters`
- Remove `search` from the filter logic in TaskList (search is handled externally)

**TaskList changes:**
- Accept `search?: string` prop
- Use `search` prop in the filter logic instead of `filters.search`:
  ```ts
  const q = (search ?? '').toLowerCase()
  const matchSearch =
    !q ||
    t.name.toLowerCase().includes(q) ||
    t.responsible?.toLowerCase().includes(q) ||
    t.notes?.toLowerCase().includes(q) ||
    t.waiting_on?.toLowerCase().includes(q)
  ```
- Pass `search` through to wherever it's used (not to FilterBar)

**AllTasksView changes:**
- Add `useState<string>('')` for `search`
- Add search input to the header row, inline with the "All Tasks" title and ViewToggle:
  ```tsx
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
  ```
- Pass `search` to `<TaskList search={search} ... />`

**CompanyView changes:**
- Add `useState<string>('')` for `search`
- Add search input to the header row, inline with company name, Export CSV, and ViewToggle:
  ```tsx
  <div className="flex items-center justify-between mb-4">
    <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
    <div className="flex items-center gap-2">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="border rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-48"
      />
      <a href={`/api/export/${company.id}`} download ...>Export CSV</a>
      <ViewToggle view={view} onChange={setView} />
    </div>
  </div>
  ```
- Pass `search` to `<TaskList search={search} ... />`

---

### Task 2: Company filter in FilterBar

**Files:**
- Modify: `components/tasks/FilterBar.tsx`
- Modify: `components/tasks/TaskList.tsx`

**FilterBar changes:**
- Add `companies?: Record<string, string>` prop (id → name map)
- Add `company: string` to `Filters` interface (default `''`)
- Render a company `<select>` dropdown when `companies` has entries:
  ```tsx
  {companies && Object.keys(companies).length > 0 && (
    <select value={filters.company} onChange={set('company')} className={inputClass}>
      <option value="">All companies</option>
      {Object.entries(companies).map(([id, name]) => (
        <option key={id} value={id}>{name}</option>
      ))}
    </select>
  )}
  ```

**TaskList changes:**
- Pass `companies` to `<FilterBar companies={companies} />`
- Add company filter to the `.filter()` chain:
  ```ts
  const matchCompany = !filters.company || t.company_id === filters.company
  return matchSearch && matchStatus && matchPriority && matchResponsible && matchCompany
  ```

---

### Task 3: Notes column in task list

**Files:**
- Modify: `components/tasks/TaskList.tsx`
- Modify: `components/tasks/TaskRow.tsx`

**TaskList changes:**
- Add `'Notes'` to both columns arrays:
  ```ts
  const columns = showCompany
    ? ['Task', 'Company', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on', 'Notes']
    : ['Task', 'Responsible', 'Status', 'Due date', 'Reminder', 'Waiting on', 'Notes']
  ```
- Update `gridTemplateColumns` in the header to include notes column (`200px` at the end):
  ```ts
  showCompany
    ? '2fr 1fr 1fr 110px 120px 120px 120px 200px'
    : '2fr 1fr 110px 120px 120px 120px 200px'
  ```

**TaskRow changes:**

Add state for notes editing:
```tsx
const [editingNotes, setEditingNotes] = useState(false)
const [notesVal, setNotesVal] = useState(task.notes ?? '')
```

Sync with task prop changes (in the existing `useEffect`):
```tsx
setNotesVal(task.notes ?? '')
```

Add notes cell to the desktop grid (after Waiting On):
```tsx
{/* Notes */}
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
```

Update the desktop grid `gridTemplateColumns` in TaskRow to match TaskList:
```ts
style={{
  gridTemplateColumns: showCompany
    ? '2fr 1fr 1fr 110px 120px 120px 120px 200px'
    : '2fr 1fr 110px 120px 120px 120px 200px',
}}
```

---

## Out of scope

- Notes column on All Tasks — company pages only (All Tasks is already wide; adding notes there would overcrowd it)
- Inline notes editing in TaskPanel — editing goes through the existing edit form (pencil icon). TaskPanel already displays notes read-only.
- Overdue filter — not requested; can be added later
- Server-side filtering — not needed; all tasks are fetched on load

---

## Self-review log

- **Data export:** N/A — UI-only changes; notes field already in DB and CSV export
- **Search:** Lifted to page header; search logic stays in TaskList receiving it as a prop
- **Empty states:** "No tasks match your filters" already handled in TaskList; notes column shows "—" for empty
- **Error handling:** Notes save uses same `updateTask` action as all other task fields
- **Timezone:** N/A — no date fields changed
- **Multi-user:** N/A — same RLS as rest of app
- **Over-engineering:** No new tables, no new server actions, no new abstractions
