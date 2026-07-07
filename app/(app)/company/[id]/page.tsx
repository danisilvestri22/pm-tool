import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CompanyView from './CompanyView'

const DANI_USER_ID = 'eb86e161-f13f-4bc2-9736-038136099aff'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: company }, { data: tasks }, { data: people }, { data: pins }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('companies').select('id, name').eq('id', id).single(),
    supabase.from('tasks').select('*').eq('company_id', id).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('people').select('name').order('name'),
    supabase.from('user_pinned_tasks').select('task_id'),
  ])

  if (!company) notFound()

  return (
    <CompanyView
      company={company}
      tasks={tasks ?? []}
      people={(people ?? []).map(p => p.name)}
      showReminder={user?.id === DANI_USER_ID}
      pinnedTaskIds={(pins ?? []).map(p => p.task_id)}
    />
  )
}
