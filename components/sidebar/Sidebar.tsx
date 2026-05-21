'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, Upload, Settings, Trash2, Menu, X } from 'lucide-react'
import type { Company } from '@/types/database'

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
}

export default function Sidebar({ companies }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
    }`

  const nav = (
    <>
      <Link href="/tasks" className={linkClass(pathname === '/tasks')} onClick={() => setMobileOpen(false)}>
        <LayoutGrid size={15} />
        All My Tasks
      </Link>
      <div className="mt-3 mb-1 px-3 text-xs text-gray-400 uppercase tracking-wide">
        Companies
      </div>
      {companies.map(c => (
        <Link
          key={c.id}
          href={`/company/${c.id}`}
          className={linkClass(pathname === `/company/${c.id}`)}
          onClick={() => setMobileOpen(false)}
        >
          {c.name}
        </Link>
      ))}
      {companies.length === 0 && (
        <p className="px-3 py-2 text-xs text-gray-400">No companies yet.</p>
      )}
    </>
  )

  const bottom = (
    <>
      <Link href="/company/new" className={linkClass(pathname === '/company/new')} onClick={() => setMobileOpen(false)}>
        <Plus size={14} />
        Add company
      </Link>
      <Link href="/import" className={linkClass(pathname === '/import')} onClick={() => setMobileOpen(false)}>
        <Upload size={14} />
        Import from Asana
      </Link>
      <Link href="/settings" className={linkClass(pathname === '/settings')} onClick={() => setMobileOpen(false)}>
        <Settings size={14} />
        Settings & links
      </Link>
      <Link
        href="/trash"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          pathname === '/trash'
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-400 hover:bg-gray-100'
        }`}
        onClick={() => setMobileOpen(false)}
      >
        <Trash2 size={14} />
        Trash
      </Link>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden bg-white border rounded-lg p-1.5 shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, static on desktop */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-56 bg-white border-r flex flex-col h-full shrink-0
          transition-transform duration-200 md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-semibold text-gray-900">PM Tool</span>
          <button
            className="md:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">{nav}</nav>
        <div className="p-2 border-t space-y-0.5">{bottom}</div>
      </aside>
    </>
  )
}
