import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { format, addDays } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

const DANI_USER_ID = 'eb86e161-f13f-4bc2-9736-038136099aff'
const DIGEST_EMAIL = 'daniellesilvestri@gmail.com'

type ReminderRow = { id: string; title: string; due_date: string }
type TaskRow = { id: string; name: string; followup_date: string; companies: { name: string } | null }

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const in7daysStr = format(addDays(today, 7), 'yyyy-MM-dd')

  const [{ data: reminders }, { data: tasks }] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, title, due_date')
      .eq('user_id', DANI_USER_ID)
      .is('completed_at', null)
      .not('due_date', 'is', null)
      .lte('due_date', in7daysStr)
      .order('due_date'),
    supabase
      .from('tasks')
      .select('id, name, followup_date, companies(name)')
      .is('deleted_at', null)
      .neq('status', 'done')
      .not('followup_date', 'is', null)
      .lte('followup_date', in7daysStr)
      .order('followup_date'),
  ])

  const r = (reminders ?? []) as ReminderRow[]
  const t = (tasks ?? []) as unknown as TaskRow[]

  const overdueReminders  = r.filter(x => x.due_date < todayStr)
  const todayReminders    = r.filter(x => x.due_date === todayStr)
  const upcomingReminders = r.filter(x => x.due_date > todayStr)

  const overdueTasks  = t.filter(x => x.followup_date < todayStr)
  const todayTasks    = t.filter(x => x.followup_date === todayStr)
  const upcomingTasks = t.filter(x => x.followup_date > todayStr)

  const total =
    overdueReminders.length + todayReminders.length + upcomingReminders.length +
    overdueTasks.length + todayTasks.length + upcomingTasks.length

  if (total === 0) return NextResponse.json({ sent: false, reason: 'nothing to report' })

  const html = buildDigestEmail({
    date: format(today, 'EEEE, MMMM d, yyyy'),
    overdueReminders, todayReminders, upcomingReminders,
    overdueTasks, todayTasks, upcomingTasks,
  })

  const { error } = await resend.emails.send({
    from: 'Project Tracker <onboarding@resend.dev>',
    to: DIGEST_EMAIL,
    subject: `Daily Digest — ${format(today, 'MMM d, yyyy')}`,
    html,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ sent: true, total })
}

function row(label: string, sub?: string) {
  return `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">
        <span style="font-size:14px;color:#111827;">${label}</span>
        ${sub ? `<span style="font-size:12px;color:#9ca3af;margin-left:8px;">${sub}</span>` : ''}
      </td>
    </tr>`
}

function section(title: string, color: string, icon: string, rows: string, count: number) {
  if (count === 0) return ''
  return `
    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:16px;">${icon}</span>
        <span style="font-size:13px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.05em;">${title}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`
}

function buildDigestEmail(args: {
  date: string
  overdueReminders: ReminderRow[]
  todayReminders: ReminderRow[]
  upcomingReminders: ReminderRow[]
  overdueTasks: TaskRow[]
  todayTasks: TaskRow[]
  upcomingTasks: TaskRow[]
}) {
  const overdueRows =
    args.overdueTasks.map(t => row(t.name, t.companies?.name ?? undefined)).join('') +
    args.overdueReminders.map(r => row(r.title, 'Reminder')).join('')

  const todayRows =
    args.todayTasks.map(t => row(t.name, t.companies?.name ?? undefined)).join('') +
    args.todayReminders.map(r => row(r.title, 'Reminder')).join('')

  const upcomingRows =
    args.upcomingTasks.map(t =>
      row(t.name, `${t.companies?.name ?? 'Reminder'} · ${format(new Date(t.followup_date + 'T12:00:00'), 'MMM d')}`)
    ).join('') +
    args.upcomingReminders.map(r =>
      row(r.title, `Reminder · ${format(new Date(r.due_date + 'T12:00:00'), 'MMM d')}`)
    ).join('')

  const overdueCount  = args.overdueReminders.length + args.overdueTasks.length
  const todayCount    = args.todayReminders.length + args.todayTasks.length
  const upcomingCount = args.upcomingReminders.length + args.upcomingTasks.length

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

    <div style="background:#059669;padding:24px 32px;">
      <div style="font-size:18px;font-weight:700;color:#fff;">Project Tracker</div>
      <div style="font-size:13px;color:#a7f3d0;margin-top:2px;">${args.date}</div>
    </div>

    <div style="padding:28px 32px;">

      ${section('Overdue', '#dc2626', '🔴', overdueRows, overdueCount)}
      ${section('Due Today', '#059669', '📋', todayRows, todayCount)}
      ${section('Coming Up — Next 7 Days', '#6b7280', '📅', upcomingRows, upcomingCount)}

    </div>

    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;">
      <a href="https://pm-tool-mu.vercel.app" style="font-size:12px;color:#059669;text-decoration:none;">Open Project Tracker →</a>
    </div>

  </div>
</body>
</html>`
}
