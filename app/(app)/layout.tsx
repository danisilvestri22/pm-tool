import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar/Sidebar'
import PushPermission from '@/components/notifications/PushPermission'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar companies={companies ?? []} />
      <main className="flex-1 overflow-auto min-w-0">
        <PushPermission />
        {/* pt-12 on mobile to clear the fixed hamburger button */}
        <div className="md:hidden h-12" />
        {children}
      </main>
    </div>
  )
}
