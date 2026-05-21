import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push'
import { format } from 'date-fns'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, name, company_id')
    .eq('followup_date', today)
    .is('deleted_at', null)
    .neq('status', 'completed')

  if (!tasks?.length) return NextResponse.json({ sent: 0 })

  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')

  let sent = 0
  for (const task of tasks) {
    for (const sub of subs ?? []) {
      try {
        await sendPushNotification(sub.subscription, {
          title: 'Follow-up reminder',
          body: task.name,
        })
        sent++
      } catch {
        // Subscription may be expired — skip silently
      }
    }
  }

  return NextResponse.json({ sent })
}
