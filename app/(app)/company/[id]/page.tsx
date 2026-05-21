import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!company) notFound()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
      </div>
      <p className="text-gray-500 text-sm">Tasks for {company.name} will appear here.</p>
    </div>
  )
}
