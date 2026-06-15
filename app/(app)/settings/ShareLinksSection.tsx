'use client'
import { useState } from 'react'
import { Copy, Check, Trash2, Plus } from 'lucide-react'
import { createShareLink, deleteShareLink } from '@/app/(app)/actions/sharelinks'
import type { Company, ShareLink } from '@/types/database'

interface LinkWithCompany extends ShareLink {
  companyName: string
}

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
  links: LinkWithCompany[]
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

export default function ShareLinksSection({ companies, links }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id ?? '')
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!selectedCompanyId || creating) return
    setCreating(true)
    setError(null)
    const res = await createShareLink(selectedCompanyId, label)
    if (res.error) setError(res.error)
    else setLabel('')
    setCreating(false)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const inputClass =
    'border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Share links</h2>
      <p className="text-xs text-gray-500 mb-4">
        Create a read-only link to share a company's task board with others — no login required.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={selectedCompanyId}
          onChange={e => setSelectedCompanyId(e.target.value)}
          className={inputClass}
        >
          {companies.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className={`${inputClass} w-44`}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !selectedCompanyId}
          className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {creating ? 'Creating…' : 'Create link'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      {links.length === 0 ? (
        <p className="text-xs text-gray-400">No share links yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div
              key={link.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {link.label ?? link.companyName}
                </p>
                <p className="text-xs text-gray-400 font-mono truncate">
                  {origin}/share/{link.token}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <CopyButton url={`${origin}/share/${link.token}`} />
                <button
                  onClick={() => deleteShareLink(link.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete link"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
