# PM Tool — Design Spec
> Date: 2026-05-15
> Status: Approved by Dani

---

## What We're Building

A custom project management web app for Dani and Mike to track tasks across multiple companies. Simpler than Asana, built exactly for how they work. Others can view but not edit.

---

## Who Uses It

| Person | Access |
|---|---|
| Dani | Full edit — add, update, move, delete tasks and projects |
| Mike | Full edit — same as Dani |
| Everyone else | View only — shared link, no login required |

---

## Navigation

Sidebar on the left listing all companies plus a pinned "All My Tasks" view at the top.

- **All My Tasks** — every task across all companies assigned to or relevant to Dani, in one list
- **Per-company views** — Oracle, Limetec, MoGo, Graphcoa, SmartKable (and any added later)
- **+ Add company** — button at the bottom of the sidebar

---

## Task Views

Each project supports two views, toggled by a button in the top right:

- **List view** — tasks in rows, all fields visible at a glance
- **Board view** — tasks as cards in columns (e.g. To Do / In Progress / Done)

---

## Fields on Every Task

Visible at a glance in list view, shown in full in the side panel:

| Field | Description |
|---|---|
| Task name | What needs to be done |
| Responsible | The person actually doing the work |
| Status | On track / At risk / Completed |
| Due date | When the task must be finished |
| Follow-up date | A separate date Dani sets to remind herself to check in — triggers a push notification to her phone |
| Waiting on | Who or what is blocking this task |
| Priority | High / Medium / Low |
| Project / Company | Which company this task belongs to (important in All My Tasks view) |
| Notes | Multi-line space for context, updates, sub-details |

---

## Opening a Task

Clicking a task slides open a side panel on the right. The task list stays visible on the left. The side panel shows all fields and allows editing.

---

## Follow-up Reminders

Separate from the task due date. Dani can set a follow-up date on any task — "remind me on this day to check in with this person." On that date, a push notification goes to her phone. She then decides whether and how to follow up. Nothing is sent automatically to anyone else.

---

## Devices

Works on both computer and phone. The layout adapts — on mobile, the sidebar collapses and the side panel takes over the full screen.

---

## Getting Started — Data Import

On first launch, import existing Asana data via CSV export. Fields map as follows:

| Asana field | PM Tool field |
|---|---|
| Task Name | Task name |
| Assignee | Responsible |
| Due Date | Due date |
| Status | Status |
| Waiting On | Waiting on |
| Priority | Priority |
| Projects | Company / Project |
| Notes | Notes |
| Parent task | Subtask relationship |

After import, all new tasks are added directly in the tool.

---

## Sorting, Filtering & Search

Within any view, Dani can:
- **Filter** by status (On track / At risk / Completed), by person (Responsible or Waiting on), or by priority
- **Sort** by due date, priority, or status
- **Search** by task name, person, or keyword across all companies

Filters can be combined (e.g. "show me all At risk tasks assigned to Tim").

---

## Subtasks

Tasks can have subtasks nested inside them — matching how Asana works today. In the task list, a parent task shows a small badge with the number of subtasks (e.g. "3 subtasks"). Clicking the task opens the side panel where subtasks are listed underneath, each with their own responsible person, due date, and status. Subtasks import cleanly from Asana.

---

## Shared View Link

- Dani generates one shareable link per company (e.g. a link just for Oracle, a separate one for Limetec)
- Anyone with the link can view that company's tasks — no login required
- There is also an "All companies" link for people who need to see everything
- Links can be turned off at any time (e.g. if someone leaves, Dani deactivates their link and it stops working immediately)
- Viewers cannot edit, comment, or see follow-up dates — those are private to Dani and Mike

---

## A Few More Details

**Search** — A search bar lets you find any task by name, person, or keyword across all companies.

**Deleting tasks** — Deleting shows an "Undo" button for 10 seconds so accidental deletes can be reversed. After that, deleted tasks go to a trash folder and stay there for 30 days before being permanently removed.

**Exporting your data** — You can download all your tasks as a CSV at any time. Your data is never locked in.

**Empty projects** — A new company with no tasks shows a prompt: "Add your first task" so it's never just a blank screen.

**Offline** — The tool requires an internet connection. If you're offline, it'll say so clearly rather than silently failing.

**If Dani and Mike edit the same task at the same time** — The last save wins. This is rare but noted.

**Timezones** — Dates and times follow your device's local timezone automatically.

**Inviting Mike** — After Dani sets up the account, she can send Mike an invite link by email. He creates a password and gets full edit access.

---

## What We're Not Building (Yet)

- Automatic messages or reminders sent to other people
- Time tracking
- File attachments
- Calendar integration
- Billing or invoicing
- A native phone app (web app works in the phone browser)
- Activity history / audit log (who changed what — Phase 2)

---

## Success Criteria

- Dani can open the tool and immediately see what's happening across all companies
- It's obvious who's responsible for what and what's blocked
- Follow-up reminders hit her phone on the right day
- Mike can log in and manage tasks alongside her
- Others can view without needing an account
- Easier and less clunky than Asana for assigning tasks to multiple projects
