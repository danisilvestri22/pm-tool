'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, Upload, Settings, Trash2 } from 'lucide-react'
import type { Company } from '@/types/database'

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
}

export default function Sidebar({ companies }: Props) {
  const pathname = usePathname()

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <aside className="w-56 bg-white border-r flex flex-col h-full shrink-0">
      <div className="p-4 border-b">
        <span className="font-semibold text-gray-900">PM Tool</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <Link href="/tasks" className={linkClass(pathname === '/tasks')}>
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
          >
            {c.name}
          </Link>
        ))}
        {companies.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-400">No companies yet.</p>
        )}
      </nav>
      <div className="p-2 border-t space-y-0.5">
        <Link href="/company/new" className={linkClass(pathname === '/company/new')}>
          <Plus size={14} />
          Add company
        </Link>
        <Link href="/import" className={linkClass(pathname === '/import')}>
          <Upload size={14} />
          Import from Asana
        </Link>
        <Link href="/settings" className={linkClass(pathname === '/settings')}>
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
        >
          <Trash2 size={14} />
          Trash
        </Link>
      </div>
    </aside>
  )
}
