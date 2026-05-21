'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function permanentlyDeleteTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { error: 'Failed to delete task' }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function emptyTrash() {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', thirtyDaysAgo)
  if (error) return { error: 'Failed to empty trash' }
  revalidatePath('/', 'layout')
  return { success: true }
}
