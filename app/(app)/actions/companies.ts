'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CompanySchema = z.object({ name: z.string().min(1).max(100) })

export async function renameCompany(id: string, name: string): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const supabase = await createClient()
  const { error } = await supabase.from('companies').update({ name: trimmed }).eq('id', id)
  if (error) return { error: 'Failed to rename company' }

  revalidatePath('/', 'layout')
  return {}
}

export async function createCompany(formData: FormData) {
  const parsed = CompanySchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: 'Company name is required' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('companies')
    .insert({ name: parsed.data.name, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: 'Failed to create company' }
  revalidatePath('/', 'layout')
  redirect(`/company/${data.id}`)
}
