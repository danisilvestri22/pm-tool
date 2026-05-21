'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CompanySchema = z.object({ name: z.string().min(1).max(100) })

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
