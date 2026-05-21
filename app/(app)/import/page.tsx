import { createClient } from '@/lib/supabase/server'
import ImportView from './ImportView'

export const metadata = { title: 'Import from Asana' }

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  return <ImportView companies={companies ?? []} />
}
