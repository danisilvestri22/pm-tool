'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaskSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1).max(500),
  responsible: z.string().optional().nullable(),
  status: z.enum(['not_started', 'in_progress', 'waiting_on_response', 'blocked', 'at_risk', 'done', 'future']).default('not_started'),
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
  status: z.enum(['not_started', 'in_progress', 'waiting_on_response', 'blocked', 'at_risk', 'done', 'future']),
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

export async function createSubtask(parentTaskId: string, name: string, companyId: string) {
  if (!name.trim()) return { error: 'Name is required' }
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert({
    name: name.trim(),
    parent_task_id: parentTaskId,
    company_id: companyId,
    status: 'not_started' as const,
    priority: 'medium' as const,
    responsible: null,
    due_date: null,
    followup_date: null,
    waiting_on: null,
    notes: null,
    board_column: 'todo' as const,
  })
  if (error) return { error: 'Failed to create subtask' }
  revalidatePath('/', 'layout')
  return { success: true }
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

export interface TaskComment {
  id: string
  task_id: string
  author_name: string
  body: string
  created_at: string
}

export async function getComments(taskId: string): Promise<TaskComment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('task_comments')
    .select('id, task_id, author_name, body, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  return (data ?? []) as TaskComment[]
}

export async function addComment(taskId: string, body: string): Promise<TaskComment | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      author_name: user.email?.split('@')[0] ?? 'Unknown',
      body,
    })
    .select()
    .single()
  if (error) return null
  return data as TaskComment
}

export async function updateComment(id: string, body: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('task_comments').update({ body }).eq('id', id)
  if (error) return { error: 'Failed to update comment' }
  return { success: true }
}

export async function deleteComment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('task_comments').delete().eq('id', id)
  if (error) return { error: 'Failed to delete comment' }
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
