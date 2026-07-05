import { createClient } from '@/lib/supabase/server'
import AllTasksView from './AllTasksView'

export const metadata = { title: 'All Tasks' }

export default async function TasksPage() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: companies }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('companies').select('id, name'),
  ])

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return <AllTasksView tasks={tasks ?? []} companies={companyMap} />
}
