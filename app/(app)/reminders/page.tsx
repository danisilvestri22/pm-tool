import { createClient } from '@/lib/supabase/server'
import RemindersView from './RemindersView'
import type { Task } from '@/types/database'

export const metadata = { title: 'Reminders' }

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: allReminders },
    { data: pins },
    { data: companies },
    { data: people },
  ] = await Promise.all([
    supabase.from('reminders').select('*').eq('user_id', user!.id).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('user_pinned_tasks').select('task_id').eq('user_id', user!.id),
    supabase.from('companies').select('id, name'),
    supabase.from('people').select('name').order('name'),
  ])

  const now = new Date().toISOString()
  const active = (allReminders ?? []).filter(r => !r.completed_at && (!r.snoozed_until || r.snoozed_until <= now))
  const snoozed = (allReminders ?? []).filter(r => !r.completed_at && r.snoozed_until && r.snoozed_until > now)
  const completed = (allReminders ?? []).filter(r => r.completed_at)

  const pinnedTaskIds = (pins ?? []).map(p => p.task_id)
  let pinnedTasks: Task[] = []
  if (pinnedTaskIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .in('id', pinnedTaskIds)
      .neq('status', 'done')
      .is('deleted_at', null)
    pinnedTasks = (data ?? []) as Task[]
  }

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return (
    <RemindersView
      active={active}
      snoozed={snoozed}
      completed={completed}
      pinnedTasks={pinnedTasks}
      companies={companyMap}
      people={(people ?? []).map(p => p.name)}
    />
  )
}
