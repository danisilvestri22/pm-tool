'use client'
import { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'

export default function InviteSection() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite() {
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSent(true)
        setEmail('')
        setTimeout(() => setSent(false), 4000)
      }
    } catch {
      setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Invite a team member</h2>
      <p className="text-xs text-gray-500 mb-4">
        They'll receive an email to set up their account and access this tool.
      </p>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleInvite()}
          placeholder="name@example.com"
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={handleInvite}
          disabled={loading || !email.trim()}
          className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {sent ? (
            <>
              <Check size={14} />
              Sent!
            </>
          ) : (
            <>
              <UserPlus size={14} />
              {loading ? 'Sending…' : 'Send invite'}
            </>
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  )
}
