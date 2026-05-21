import { createClient } from '@/lib/supabase/server'
import TrashView from './TrashView'

export const metadata = { title: 'Trash' }

export default async function TrashPage() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: companies }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase.from('companies').select('id, name'),
  ])

  const companyMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]))

  return <TrashView tasks={tasks ?? []} companies={companyMap} />
}
