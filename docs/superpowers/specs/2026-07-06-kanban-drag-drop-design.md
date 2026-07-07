# Kanban Drag-and-Drop Design

**Goal:** Make the board view fully interactive — cards draggable between 6 columns that map 1:1 to task statuses, updating the DB on drop.

**Architecture:** Use @dnd-kit for drag-and-drop. TaskBoard renders one column per status value. Dragging a card calls the existing `updateTask` server action with the new status. Optimistic UI updates the card position immediately; on failure it snaps back. The `board_column` DB field is retained but no longer drives board rendering — status is the source of truth.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable (already-compatible React 19 / Next.js App Router)

---

## Columns

Six columns, left to right:

| Column label | status value |
|---|---|
| Not Started | `not_started` |
| In Progress | `in_progress` |
| Waiting on Response | `waiting_on_response` |
| Blocked | `blocked` |
| Overdue / At Risk | `at_risk` |
| Done | `done` |

Columns scroll horizontally on narrow screens. Each column is 288px wide (`w-72`).

---

## Drag Behavior

- **Drag source:** Each `BoardCard` is wrapped in a `@dnd-kit` `useDraggable` hook. Cursor changes to `grab` on hover, `grabbing` while dragging.
- **Drop target:** Each column container is a `useDroppable` zone. The active drop zone gets a visible highlight (emerald border + light background).
- **On drop:** If the card is dropped in a different column, an optimistic state update moves the card immediately. Then `updateTask(id, { status: newStatus })` is called. If it fails, the task list reverts.
- **Cancelled drag:** Card returns to original column with no DB call.
- **Click vs drag:** A short drag distance threshold prevents accidental drags when tapping to open the task panel. Clicks still open the TaskPanel normally.

---

## Files Changed

- **`components/tasks/TaskBoard.tsx`** — Replace static column rendering with `DndContext` + `useDroppable` columns. Manage optimistic task list in local state. Handle `onDragEnd` to detect column changes and call `updateTask`.
- **`components/tasks/BoardCard.tsx`** — Wrap card in `useDraggable`. Add drag handle cursor styles. Keep click-to-open behavior via `onClick` (only fires if not dragging).

---

## Error Handling

- If `updateTask` returns an error, revert the optimistic state. No toast needed — the card visually returns to its original column, which is self-explanatory.
- No loading spinner — the optimistic update makes the UI feel instant.

---

## Out of Scope

- Sorting within a column (reordering cards inside the same column) — not needed.
- Drag-and-drop on mobile touch (iPhone) — @dnd-kit supports pointer events which work on touch; no extra configuration needed.
- Changing `board_column` DB field on drag — status is now the source of truth; `board_column` is a legacy field and will be left as-is.
- Subtasks on the board — only top-level tasks appear on the board (same as today).
