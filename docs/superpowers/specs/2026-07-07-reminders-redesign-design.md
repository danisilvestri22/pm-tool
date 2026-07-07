# Reminders Redesign Design

**Goal:** Redesign the Reminders tab into a personal task tracker with grouped sections, a project-task toggle, per-task pinning, and a global quick-add bell in the sidebar.

**Architecture:** The Reminders page fetches personal reminders from the `reminders` table plus optionally project tasks (filtered by responsible = current user) and pinned tasks (from a new `user_pinned_tasks` join table). All items are merged client-side and grouped by due date. A sidebar quick-add widget saves directly to the `reminders` table via an existing server action.

**Tech Stack:** Next.js 16.2.6 App Router, React 19, TypeScript, Tailwind v4, Supabase PostgreSQL, date-fns, lucide-react

---

## 1. Grouped List (Reminders tab)

Five groups, rendered top-to-bottom:

| Group | Condition | Default state |
|---|---|---|
| Overdue | due_date < today | Expanded |
| Today | due_date = today | Expanded |
| Next | due_date is tomorrow through +7 days | Expanded |
| Scheduled | due_date > +7 days | Collapsed |
| Unscheduled | no due_date | Collapsed |

- Each group header shows the label + item count and is clickable to collapse/expand. Groups with zero items are hidden entirely.
- Overdue group cards get a red left border (`border-red-300`) to visually flag urgency.
- Today group gets an amber accent on the date label.
- At the bottom, a "Show X completed" link expands the completed section (personal reminders only — project tasks don't have a completed_at).
- Snoozed reminders continue to be hidden while snoozed and reappear after the snooze time passes.
- Items within each group sort by due_date ascending, nulls last.

**Item types in the list:**

- **Personal reminders** — from `reminders` table. Show edit / snooze / complete / delete actions (same as today).
- **Pinned project tasks** — always shown. Display task name, company name, due date, status badge. Actions: unpin only (no complete/delete — those are managed in the task view).
- **Project tasks via toggle** — same display as pinned tasks. No complete/delete actions.

Pinned tasks and toggle tasks that are already `done` status are excluded from the list.

---

## 2. "Show My Project Tasks" Toggle

A toggle button in the Reminders page header. Off by default.

- When **on**: fetches all tasks where `status != 'done'` and `deleted_at IS NULL` and `responsible` matches the user's configured display name. These tasks appear in the grouped list alongside personal reminders, bucketed into the same groups by their `due_date`.
- **Display name resolution:** The Reminders page shows a small inline "Assigned to: [name]" selector next to the toggle (only visible when the toggle is on). It's a dropdown populated from the `people` table. The selected name persists in `localStorage` key `reminders_my_name`. This avoids any DB schema change and works for both Dani and Mike.
- Toggle state persists in `localStorage` key `reminders_show_tasks` so it survives page reloads.
- Pinned tasks always appear regardless of toggle state.
- If a task is both pinned and would appear via the toggle, it shows once (deduplicated by task id).

---

## 3. Pin Icon on Task Rows

A pin icon (📌 `Pin` from lucide-react) appears on each task row in:
- `components/tasks/TaskRow.tsx` (list view)
- `components/tasks/BoardCard.tsx` (board view — on hover)

**Behavior:**
- Filled/colored pin = task is pinned. Outline pin = not pinned.
- Clicking pin calls `pinTask(taskId)` server action; clicking again calls `unpinTask(taskId)`.
- Optimistic UI: toggle the icon immediately, revert on error.
- Pin state is loaded from the server on page load and passed down as a `pinnedTaskIds: Set<string>` prop.

**DB:** New table `user_pinned_tasks`:
```sql
create table user_pinned_tasks (
  user_id uuid references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
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

**Server actions** (in `app/(app)/actions/reminders.ts`):
- `pinTask(taskId: string)` — inserts into `user_pinned_tasks`
- `unpinTask(taskId: string)` — deletes from `user_pinned_tasks`
- Both revalidate `/reminders`

---

## 4. Global Quick-Add (Sidebar Header)

A small bell+plus button in the sidebar header, next to the "Project Tracker" title text.

- Clicking opens an inline popup (positioned below the header, `absolute` within the sidebar).
- Popup contains: **title** (text input, required, autofocused) and **due date** (date input, optional).
- Submit calls `createReminder(formData)` (existing server action). On success, popup closes and form resets.
- Clicking outside the popup closes it (mousedown listener on document).
- No "details" field — quick-add is intentionally minimal. Full editing is available on the Reminders page.

**Files changed:**
- `components/sidebar/Sidebar.tsx` — add `QuickAddReminder` sub-component with open/close state, positioned relative to sidebar header.

---

## 5. Files Changed

| File | Change |
|---|---|
| `components/sidebar/Sidebar.tsx` | Add `QuickAddReminder` component in sidebar header |
| `app/(app)/reminders/page.tsx` | Fetch pinned task ids + pinned tasks; pass to RemindersView |
| `app/(app)/reminders/RemindersView.tsx` | Full rewrite — grouped sections, toggle, collapsible groups |
| `app/(app)/actions/reminders.ts` | Add `pinTask` and `unpinTask` server actions |
| `components/tasks/TaskRow.tsx` | Add pin icon with optimistic toggle |
| `components/tasks/TaskList.tsx` | Accept + pass down `pinnedTaskIds` prop |
| `app/(app)/company/[id]/CompanyView.tsx` | Fetch and pass `pinnedTaskIds` |
| `app/(app)/tasks/AllTasksView.tsx` | Fetch and pass `pinnedTaskIds` |
| Supabase migration | Create `user_pinned_tasks` table with RLS |

BoardCard.tsx pin icon is out of scope for now — the list view is the primary interaction surface.

---

## 6. Out of Scope

- Delegated tab (tasks where you're in Waiting On) — deferred, not needed now.
- Pin icon on BoardCard (Kanban) — deferred; list view is sufficient.
- Push notifications for reminders — separate project.
- Details field in quick-add popup — use the full Reminders page for that.
- Drag-to-reorder within groups — not needed.
- Sharing reminders with other users — not needed (personal only).
