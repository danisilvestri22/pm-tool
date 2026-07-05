# Editable People List — Design Spec
Date: 2026-07-05

## Problem
The Responsible and Waiting On dropdowns in task rows use a hardcoded array (`KNOWN_NAMES`) in `TaskRow.tsx`. Adding, removing, or renaming a person requires a code change and a redeploy.

## Solution
Store the people list in Supabase. Manage it via a new "People" section on the Settings page. Pass the list down to task rows at runtime.

## Data

**New table: `people`**
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

Names are stored as free text on tasks (`responsible`, `waiting_on` columns). Removing a person from the list does not affect existing tasks — those names stay stored as-is, they just won't appear as future dropdown options.

## Settings Page — People Section

New `PeopleSection` component added to `app/(app)/settings/`. Renders above the Invite section.

**Behavior:**
- Lists all names for the current user, sorted alphabetically
- Each row: name (click to rename inline, Enter or blur to save) + X delete button
- Input at the bottom with an Add button to add a new name
- Duplicate names are rejected (case-insensitive check before insert and before rename)
- Empty names are rejected
- Empty state: if no people exist yet, shows a short prompt ("Add your first person below")

**Server actions** (new file: `app/(app)/actions/people.ts`):
- `addPerson(name)` — inserts, revalidates settings page
- `renamePerson(id, name)` — updates, revalidates settings page
- `deletePerson(id)` — deletes, revalidates settings page

## Dropdowns

`TaskRow.tsx` currently has:
```ts
const KNOWN_NAMES = ['Dani', 'Mike', 'Rick Sr', 'Rick Jr', 'Renato', 'Vitor']
```

This gets removed. Instead, `TaskRow` accepts a `people: string[]` prop.

**Prop threading:**
- `CompanyView` fetches people from Supabase, passes to `TaskList`
- `AllTasksView` fetches people from Supabase, passes to `TaskList`
- `TaskList` passes to `TaskRow`
- Company page server component (`app/(app)/company/[id]/page.tsx`) adds people to its data fetch

## Task Form — Responsible Dropdown

The Responsible field in `TaskForm.tsx` currently uses a free-text `<input>` with a `<datalist>` for suggestions. It becomes a proper `<select>` dropdown with the people list as options.

**"Add new person" option:**
- A special "＋ Add new person…" option appears at the bottom of the dropdown
- Selecting it replaces the select with a small inline text input
- User types the name and presses Enter (or clicks Add)
- On confirm: calls `addPerson()` server action, new person is saved to the `people` table, and their name is set as the selected value in the form
- Cancel link returns to the dropdown without saving
- The same people list prop already passed to `TaskForm` via `knownNames` is used — no extra fetch needed
- Waiting On field keeps its current `<datalist>` behavior (free text with suggestions), only Responsible becomes a strict select

## Out of Scope
- Per-company people lists — one shared list across all companies
- Renaming a person cascades to existing tasks — not in scope; names are stored as text, not foreign keys
- Role or access level on people — names only
