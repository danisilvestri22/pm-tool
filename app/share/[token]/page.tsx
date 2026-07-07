import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import StatusBadge from '@/components/tasks/StatusBadge'
import type { Task } from '@/types/database'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: link } = await supabase
    .from('share_links')
    .select('id, company_id, label, active')
    .eq('token', token)
    .single()

  if (!link || !link.active || !link.company_id) notFound()

  const [{ data: company }, { data: tasks }] = await Promise.all([
    supabase.from('companies').select('name').eq('id', link.company_id).single(),
    supabase
      .from('tasks')
      .select('*')
      .eq('company_id', link.company_id)
      .is('deleted_at', null)
      .is('parent_task_id', null)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false }),
  ])

  if (!company) notFound()

  const topLevelTasks = (tasks ?? []) as Task[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{company.name}</h1>
            {link.label && <p className="text-xs text-gray-500 mt-0.5">{link.label}</p>}
          </div>
          <span className="text-xs text-gray-400">View only</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {topLevelTasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No open tasks.</p>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div
              className="grid px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b gap-3"
              style={{ gridTemplateColumns: '2fr 1fr 90px 80px 90px' }}
            >
              <span>Task</span>
              <span>Responsible</span>
              <span>Status</span>
              <span>Due date</span>
              <span>Waiting on</span>
            </div>
            <div className="divide-y divide-gray-50">
              {topLevelTasks.map(task => {
                const isOverdue =
                  task.due_date &&
                  task.status !== 'done' &&
                  new Date(task.due_date) < new Date()
                return (
                  <div
                    key={task.id}
                    className={`grid items-center gap-3 px-4 py-3 text-sm border-l-2 ${
                      task.status === 'at_risk'
                        ? 'border-red-400 bg-red-50/30'
                        : 'border-transparent'
                    }`}
                    style={{ gridTemplateColumns: '2fr 1fr 90px 80px 90px' }}
                  >
                    <span className="font-medium text-gray-900 truncate">{task.name}</span>
                    <span className="text-gray-600 truncate">{task.responsible ?? '—'}</span>
                    <StatusBadge status={task.status} />
                    <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
                    </span>
                    <span className="text-gray-500 truncate">{task.waiting_on ?? '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
