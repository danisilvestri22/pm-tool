'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, Settings, Trash2, Menu, X, Bell } from 'lucide-react'
import { createReminder } from '@/app/(app)/actions/reminders'
import type { Company } from '@/types/database'

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
}

function QuickAddReminder() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await createReminder(fd)
    if (result?.success) {
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
        aria-label="Quick add reminder"
      >
        <Bell size={14} />
        <Plus size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 bg-white border rounded-xl shadow-lg p-4 w-64 z-50">
          <p className="text-xs font-semibold text-gray-700 mb-3">Quick reminder</p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              name="title"
              required
              autoFocus
              placeholder="What do you need to remember?"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              name="due_date"
              className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
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
      <button
        className="fixed top-3 left-3 z-50 md:hidden bg-white border rounded-lg p-1.5 shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-56 bg-slate-800 border-r border-slate-700 flex flex-col h-full shrink-0
          transition-transform duration-200 md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <span className="font-semibold text-white">Project Tracker</span>
          <div className="flex items-center gap-2">
            <QuickAddReminder />
            <button
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">{nav}</nav>
        <div className="p-2 border-t border-slate-700 space-y-0.5">{bottom}</div>
      </aside>
    </>
  )
}
