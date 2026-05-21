'use client'
import { useEffect, useState } from 'react'

export default function PushPermission() {
  const [status, setStatus] = useState<NotificationPermission | 'unsupported' | 'loading'>(
    'loading',
  )

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported')
    } else {
      setStatus(Notification.permission)
    }
  }, [])

  async function enable() {
    const permission = await Notification.requestPermission()
    setStatus(permission)
    if (permission !== 'granted') return

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
    } catch {
      // Service worker or push subscription failed — non-critical
    }
  }

  if (status === 'loading' || status === 'granted' || status === 'unsupported') return null

  return (
    <div className="mx-6 mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
      <p className="text-sm text-indigo-800">
        Enable notifications to get follow-up reminders on your phone.
      </p>
      <button
        onClick={enable}
        className="text-sm font-medium text-indigo-700 hover:text-indigo-900 ml-4 shrink-0"
      >
        Enable
      </button>
    </div>
  )
}
