'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Task } from '@/types/database'

export async function createReminder(formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('reminders').insert({
    user_id: user.id,
    title,
    details: (formData.get('details') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
  })
  if (error) return { error: 'Failed to create reminder' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function snoozeReminder(id: string, until: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reminders')
    .update({ snoozed_until: until })
    .eq('id', id)
  if (error) return { error: 'Failed to snooze' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function completeReminder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reminders')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: 'Failed to complete' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function updateReminder(id: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()
  const { error } = await supabase.from('reminders').update({
    title,
    details: (formData.get('details') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
  }).eq('id', id)

  if (error) return { error: 'Failed to update reminder' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) return { error: 'Failed to delete' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function pinTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('user_pinned_tasks')
    .insert({ user_id: user.id, task_id: taskId })
  if (error) return { error: 'Failed to pin task' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function unpinTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('user_pinned_tasks')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', user.id)
  if (error) return { error: 'Failed to unpin task' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function setTaskReminderDate(taskId: string, date: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('user_pinned_tasks')
    .update({ reminder_date: date || null })
    .eq('task_id', taskId)
    .eq('user_id', user.id)
  if (error) return { error: 'Failed to update reminder date' }
  revalidatePath('/reminders')
  return { success: true }
}

export async function getMyTasks(name: string): Promise<Task[]> {
  if (!name) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('responsible', name)
    .neq('status', 'done')
    .is('deleted_at', null)
    .is('parent_task_id', null)
    .order('due_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as Task[]
}
