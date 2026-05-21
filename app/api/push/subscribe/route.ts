import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await req.json()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, subscription },
    { onConflict: 'user_id' },
  )
  if (error) return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })

  return NextResponse.json({ success: true })
}
