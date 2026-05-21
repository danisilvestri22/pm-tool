import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()
  if (!company) return new NextResponse('Not found', { status: 404 })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, parent:parent_task_id(name)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const headers = [
    'Name',
    'Responsible',
    'Status',
    'Priority',
    'Due Date',
    'Follow-up Date',
    'Waiting On',
    'Notes',
    'Parent Task',
  ]

  function escape(val: string | null | undefined): string {
    if (!val) return ''
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const rows = (tasks ?? []).map(t => {
    const parentName =
      t.parent && typeof t.parent === 'object' && 'name' in t.parent
        ? (t.parent as { name: string }).name
        : ''
    return [
      escape(t.name),
      escape(t.responsible),
      escape(t.status),
      escape(t.priority),
      escape(t.due_date),
      escape(t.followup_date),
      escape(t.waiting_on),
      escape(t.notes),
      escape(parentName),
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const slug = company.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-tasks.csv"`,
    },
  })
}
