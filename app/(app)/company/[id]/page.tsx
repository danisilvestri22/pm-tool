import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CompanyView from './CompanyView'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: company }, { data: tasks }, { data: people }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('id', id).single(),
    supabase
      .from('tasks')
      .select('*')
      .eq('company_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('people').select('name').order('name'),
  ])

  if (!company) notFound()

  return (
    <CompanyView
      company={company}
      tasks={tasks ?? []}
      people={(people ?? []).map(p => p.name)}
    />
  )
}
