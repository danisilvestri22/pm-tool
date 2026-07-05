import { createClient } from '@/lib/supabase/server'
import ShareLinksSection from './ShareLinksSection'
import InviteSection from './InviteSection'
import PeopleSection from './PeopleSection'
import type { ShareLink } from '@/types/database'

export const metadata = { title: 'Settings & Links' }

export default async function SettingsPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: links }, { data: people }] = await Promise.all([
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('share_links').select('*, company:company_id(name)').eq('active', true),
    supabase.from('people').select('id, name').order('name'),
  ])

  const enrichedLinks = (links ?? []).map(l => ({
    ...(l as ShareLink),
    companyName:
      l.company && typeof l.company === 'object' && 'name' in l.company
        ? (l.company as { name: string }).name
        : '',
  }))

  return (
    <div className="p-6 max-w-lg space-y-10">
      <h1 className="text-xl font-semibold text-gray-900">Settings & Links</h1>
      <PeopleSection people={people ?? []} />
      <hr />
      <InviteSection />
      <hr />
      <ShareLinksSection companies={companies ?? []} links={enrichedLinks} />
    </div>
  )
}
