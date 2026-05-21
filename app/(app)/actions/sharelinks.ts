'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createShareLink(companyId: string, label: string) {
  const supabase = await createClient()
  const token = crypto.randomUUID()
  const { error } = await supabase.from('share_links').insert({
    company_id: companyId,
    token,
    label: label || null,
    active: true,
  })
  if (error) return { error: 'Failed to create link' }
  revalidatePath('/settings')
  return { token }
}

export async function deleteShareLink(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('share_links').delete().eq('id', id)
  if (error) return { error: 'Failed to delete link' }
  revalidatePath('/settings')
  return { success: true }
}
