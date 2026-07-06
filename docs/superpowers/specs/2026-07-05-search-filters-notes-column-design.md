# Search, Filters, and Notes Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a company filter to the existing filter bar on All Tasks, and add an inline-editable notes column to the task list on company pages.

**Architecture:** FilterBar and its filter logic already exist in `TaskList.tsx` and are already wired into both All Tasks and company pages. The two remaining gaps are: (1) no company filter exists in FilterBar for filtering across companies on All Tasks; (2) no notes column exists in the task list. All filtering is client-side — tasks are already fetched on page load.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Supabase SSR. `notes text` column already exists in the `tasks` table. No DB migration needed.

---

## What's already built (do not re-implement)

- `components/tasks/FilterBar.tsx` — full filter UI with search, status, priority, responsible, sort
- `components/tasks/TaskList.tsx` — already imports and renders FilterBar with full filter/sort logic
- `notes` field — already in `Task` type, `tasks` DB table, `TaskForm`, and read-only display in `TaskPanel`
- `updateTask` server action — already handles `notes` field

---

## Scope

### Task 1: Company filter in FilterBar

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

### Task 2: Notes column in task list

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
- Update `gridTemplateColumns` in both the header and (via TaskRow) the rows to include a notes column. Add `200px` at the end:
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
- Inline notes editing in TaskPanel — editing goes through the existing edit form (pencil icon). TaskPanel already displays notes read-only; this is sufficient for now.
- Overdue filter — not requested; can be added later
- Server-side filtering — not needed; all tasks are fetched on load and filtering is fast client-side

---

## Self-review log

- **Data export:** N/A — UI-only changes; notes field already exists in DB and is included in CSV export
- **Search:** Already implemented in TaskList; this spec adds company filter only
- **Empty states:** "No tasks match your filters" already handled in TaskList; notes column shows "—" for empty
- **Error handling:** Notes save uses same `updateTask` action as all other task fields; same error surface
- **Timezone:** N/A — no date fields changed
- **Multi-user:** N/A — same RLS as rest of app
- **Over-engineering:** No new tables, no new server actions, no new abstractions — two files modified
