'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) return { error: 'Failed to delete' }
  revalidatePath('/reminders')
  return { success: true }
}
