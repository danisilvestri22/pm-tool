# PM Tool — Project Memory

> Working directory: `/Users/daniellesilvestri/Claude Code/apps-and-tools/pm-tool`
> Last updated: 2026-05-21 (session 3)

## Status: LIVE

The app is fully built and deployed.

- **Live URL:** https://pm-tool-mu.vercel.app
- **GitHub:** https://github.com/danisilvestri22/pm-tool
- **Supabase project:** gglvlgvglzhatqzrbqtx (Dani's Org / pm-tool)
- **Vercel project:** pm-tool (Dani's projects / Hobby)
- **Dani's login:** daniellesilvestri@gmail.com (created in Supabase Auth)
- **Mike's email:** mikepsilve@gmail.com (not yet invited — use Settings page)

## What's built (all tasks complete)

All 20 original tasks + 4 additional features done. Key features:
- Company pages with list + board view
- Task CRUD with status, priority, responsible, due date, follow-up date, waiting on, notes
- **Inline date pickers** — due date and follow-up date editable inline via `<input type="date">` in TaskPanel
- **Name autocomplete dropdowns** — Responsible and Waiting On fields use `<datalist>` populated from `getKnownNames()` (distinct values across all tasks)
- **Reminder date column** — followup_date shown in task list as indigo-colored 'MMM d' date
- **Personal Reminders page** (`/reminders`) — standalone todos with title, details, due date, snooze (1h/tomorrow/3d/1wk), complete, delete; sections: active / snoozed / completed
- Subtasks with inline add + completion toggle
- Filter/sort/search across tasks
- All My Tasks cross-company view
- Push notifications for follow-up dates (cron: 0 13 * * * UTC via Vercel)
- Asana CSV import (handles Responsibility, Status, Priority, Waiting On columns)
- CSV export per company
- Shareable read-only links (Settings page)
- Team invite via Settings page (uses Supabase admin inviteUserByEmail)
- Mobile responsive (collapsible sidebar, full-screen TaskPanel on mobile)
- Trash with 30-day recovery + permanent delete

## Pending deploy

4 new features are committed locally but NOT yet pushed to GitHub/Vercel:
1. Inline date pickers
2. Name dropdowns (datalist)
3. Reminder date column
4. Personal Reminders page

**Blocker:** Supabase `reminders` table must be created first. SQL to run in Supabase SQL Editor:

```sql
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text,
  due_date date,
  snoozed_until timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table reminders enable row level security;
create policy "own reminders" on reminders
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on reminders (user_id);
```

After SQL is confirmed: create GitHub PAT, `git push https://TOKEN@github.com/danisilvestri22/pm-tool.git main`, delete PAT.

## Data already imported

Companies and tasks seeded via `scripts/seed-from-asana.mjs` on 2026-05-21:
- **Oracle** — 2 tasks (Tim: Create app [At risk/High]; Mike: Call Renato)
- **Limetec** — 6 tasks (Developing a video + "keep video project moving" + 4 subtasks)
- **MoGo** — 1 task (Create client onboarding process; Dani; waiting on Rick S)
- **Graphcoa** — 1 task (Task 1; placeholder)
- **SmartKable** — 1 task (Schedule call for SmartKable; waiting on Rick S)

Source CSV files are in `/Users/daniellesilvestri/Downloads/` — Oracle.csv, Limetec.csv, MoGo.csv, Graphcoa.csv, Dani.csv, Dani 2.csv, Graphcoa 2.csv.

## Tech stack

- Next.js 16.2.6 (App Router) — breaking changes: `await params`, `await cookies()`, no `metadata` in client components
- React 19, Tailwind v4, Zod v4, Supabase SSR v0.10.3
- `createClient()` is async everywhere
- Route group `app/(app)/` applies the authenticated shell layout
- `app/page.tsx` redirects to `/tasks` (avoids route conflict with the route group)
- All mutations use Server Actions + `revalidatePath('/', 'layout')`
- Admin/service-role client: `lib/supabase/admin.ts` → `createAdminClient()`
- VAPID keys already in `.env.local` for push notifications
- `CRON_SECRET=pm-tool-cron-2026`

## Key file locations

- Layout: `app/(app)/layout.tsx`
- Server actions: `app/(app)/actions/` (tasks.ts, companies.ts, import.ts, sharelinks.ts, trash.ts, reminders.ts)
- Components: `components/tasks/`, `components/sidebar/`, `components/ui/`
- Public share page: `app/share/[token]/page.tsx` (uses admin client, no auth)
- Push cron: `app/api/cron/followup-reminders/route.ts`
- Seed script: `scripts/seed-from-asana.mjs`
- DB schema: `supabase/migrations/001_initial_schema.sql`
- Reminders page: `app/(app)/reminders/page.tsx` + `RemindersView.tsx`
- Reminders actions: `app/(app)/actions/reminders.ts`

## Pending / next steps

- **Run Supabase SQL migration** (see above) → then push to GitHub
- **Invite Mike:** Go to Settings & Links → enter mikepsilve@gmail.com → Send invite
- **Service role key rotation:** Legacy Supabase key was visible in chat. Low risk (private session) but worth rotating later via JWT Keys → standby key process
- **Homebrew not installed** on Dani's Mac — needed `git push` via token each time
- **No `gh` CLI** installed — future pushes need a GitHub PAT or Homebrew first
- **MoGo task due date** shows as 2026-05-10 (updated from original 5/1 in Dani.csv)
