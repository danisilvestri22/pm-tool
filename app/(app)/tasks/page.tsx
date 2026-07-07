import { createClient } from '@/lib/supabase/server'
import AllTasksView from './AllTasksView'

export const metadata = { title: 'All Tasks' }

const DANI_USER_ID = 'eb86e161-f13f-4bc2-9736-038136099aff'

export default async function TasksPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: tasks }, { data: companies }, { data: people }, { data: pins }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tasks').select('*').is('deleted_at', null).neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('companies').select('id, name'),
    supabase.from('people').select('name').order('name'),
    supabase.from('user_pinned_tasks').select('task_id'),
  ])

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return (
    <AllTasksView
      tasks={tasks ?? []}
      companies={companyMap}
      people={(people ?? []).map(p => p.name)}
      showReminder={user?.id === DANI_USER_ID}
      pinnedTaskIds={(pins ?? []).map(p => p.task_id)}
    />
  )
}
