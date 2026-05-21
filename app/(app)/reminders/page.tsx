import { createClient } from '@/lib/supabase/server'
import RemindersView from './RemindersView'

export const metadata = { title: 'Reminders' }

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: all } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user!.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  const now = new Date().toISOString()
  const active = (all ?? []).filter(r => !r.completed_at && (!r.snoozed_until || r.snoozed_until <= now))
  const snoozed = (all ?? []).filter(r => !r.completed_at && r.snoozed_until && r.snoozed_until > now)
  const completed = (all ?? []).filter(r => r.completed_at)

  return <RemindersView active={active} snoozed={snoozed} completed={completed} />
}
