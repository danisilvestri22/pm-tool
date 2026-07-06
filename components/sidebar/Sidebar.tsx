'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, Settings, Trash2, Menu, X, Bell } from 'lucide-react'
import type { Company } from '@/types/database'

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
}

export default function Sidebar({ companies }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      active
        ? 'bg-slate-700 text-emerald-400 font-medium'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`

  const nav = (
    <>
      <Link href="/tasks" className={linkClass(pathname === '/tasks')} onClick={() => setMobileOpen(false)}>
        <LayoutGrid size={15} />
        All Tasks
      </Link>
      <div className="mt-3 mb-1 px-3 text-xs text-slate-500 uppercase tracking-wide">
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
        <p className="px-3 py-2 text-xs text-slate-500">No companies yet.</p>
      )}
    </>
  )

  const bottom = (
    <>
      <Link href="/reminders" className={linkClass(pathname === '/reminders')} onClick={() => setMobileOpen(false)}>
        <Bell size={14} />
        Reminders
      </Link>
      <Link href="/company/new" className={linkClass(pathname === '/company/new')} onClick={() => setMobileOpen(false)}>
        <Plus size={14} />
        Add company
      </Link>
<Link href="/settings" className={linkClass(pathname === '/settings')} onClick={() => setMobileOpen(false)}>
        <Settings size={14} />
        Settings & Links
      </Link>
      <Link
        href="/trash"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          pathname === '/trash'
            ? 'bg-slate-700 text-emerald-400 font-medium'
            : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'
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

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-56 bg-slate-800 border-r border-slate-700 flex flex-col h-full shrink-0
          transition-transform duration-200 md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <span className="font-semibold text-white">Project Tracker</span>
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">{nav}</nav>
        <div className="p-2 border-t border-slate-700 space-y-0.5">{bottom}</div>
      </aside>
    </>
  )
}
