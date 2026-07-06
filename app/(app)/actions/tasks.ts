'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaskSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1).max(500),
  responsible: z.string().optional().nullable(),
  status: z.enum(['on_track', 'at_risk', 'completed']).default('on_track'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  due_date: z.string().optional().nullable(),
  followup_date: z.string().optional().nullable(),
  waiting_on: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  board_column: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  parent_task_id: z.string().uuid().optional().nullable(),
})

// Update schema has no .default() — we must never fill in values the caller didn't provide.
const UpdateTaskSchema = z.object({
  name: z.string().min(1).max(500),
  responsible: z.string().nullable(),
  status: z.enum(['on_track', 'at_risk', 'completed']),
  priority: z.enum(['high', 'medium', 'low']),
  due_date: z.string().nullable(),
  followup_date: z.string().nullable(),
  waiting_on: z.string().nullable(),
  notes: z.string().nullable(),
  board_column: z.enum(['todo', 'in_progress', 'done']),
  parent_task_id: z.string().uuid().nullable(),
}).partial()

// Used for createTask: fills all nullable fields with null if absent.
function coerce(raw: Record<string, FormDataEntryValue>) {
  return {
    ...raw,
    responsible: raw.responsible || null,
    due_date: raw.due_date || null,
    followup_date: raw.followup_date || null,
    waiting_on: raw.waiting_on || null,
    notes: raw.notes || null,
    parent_task_id: raw.parent_task_id || null,
  }
}

// Used for updateTask: only converts empty strings to null for keys that are present.
// Missing keys stay absent so Supabase doesn't overwrite them.
function coerceUpdate(raw: Record<string, FormDataEntryValue>) {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v === '' ? null : v])
  )
}

export async function createTask(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = TaskSchema.safeParse(coerce(raw))
  if (!parsed.success) return { error: 'Invalid task data' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert(parsed.data)
  if (error) return { error: 'Failed to create task' }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateTask(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = UpdateTaskSchema.safeParse(coerceUpdate(raw))
  if (!parsed.success) return { error: 'Invalid task data' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update(parsed.data).eq('id', id)
  if (error) return { error: 'Failed to update task' }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function softDeleteTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: 'Failed to delete task' }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function restoreTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ deleted_at: null }).eq('id', id)
  if (error) return { error: 'Failed to restore task' }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getKnownNames(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('responsible, waiting_on')
    .is('deleted_at', null)
  if (!data) return []
  const names = new Set<string>()
  for (const t of data) {
    if (t.responsible) names.add(t.responsible)
    if (t.waiting_on) names.add(t.waiting_on)
  }
  return [...names].sort()
}

export async function updateBoardColumn(
  id: string,
  column: 'todo' | 'in_progress' | 'done',
) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ board_column: column }).eq('id', id)
  if (error) return { error: 'Failed to move task' }
  revalidatePath('/', 'layout')
  return { success: true }
}
