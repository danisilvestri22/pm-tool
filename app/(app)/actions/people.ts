'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addPerson(name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return { error: 'That name already exists' }

  const { error } = await supabase.from('people').insert({ name: trimmed })
  if (error) return { error: 'Failed to add person' }

  revalidatePath('/', 'layout')
  return {}
}

export async function renamePerson(id: string, name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .ilike('name', trimmed)
    .neq('id', id)
    .maybeSingle()

  if (existing) return { error: 'That name already exists' }

  const { error } = await supabase.from('people').update({ name: trimmed }).eq('id', id)
  if (error) return { error: 'Failed to rename person' }

  revalidatePath('/', 'layout')
  return {}
}

export async function deletePerson(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) return { error: 'Failed to delete person' }

  revalidatePath('/', 'layout')
  return {}
}
