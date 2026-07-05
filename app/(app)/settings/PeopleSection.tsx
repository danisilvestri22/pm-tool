'use client'
import { useState } from 'react'
import { X, Check, Pencil } from 'lucide-react'
import { addPerson, renamePerson, deletePerson } from '@/app/(app)/actions/people'

interface Person {
  id: string
  name: string
}

interface Props {
  people: Person[]
}

export default function PeopleSection({ people }: Props) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    setError(null)
    const result = await addPerson(newName)
    if (result.error) {
      setError(result.error)
    } else {
      setNewName('')
    }
    setAdding(false)
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) {
      setEditingId(null)
      return
    }
    setError(null)
    const result = await renamePerson(id, editingName)
    if (result.error) {
      setError(result.error)
    } else {
      setEditingId(null)
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditingName(person.name)
    setError(null)
  }

  async function handleDelete(id: string) {
    setError(null)
    const result = await deletePerson(id)
    if (result.error) setError(result.error)
  }

  const inputClass =
    'border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">People</h2>
      <p className="text-xs text-gray-500 mb-4">
        These names appear in the Responsible and Waiting On dropdowns.
      </p>

      {people.length === 0 ? (
        <p className="text-xs text-gray-400 mb-4">Add your first person below.</p>
      ) : (
        <ul className="space-y-1 mb-4">
          {people.map(p => (
            <li key={p.id} className="flex items-center gap-2">
              {editingId === p.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(p.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => handleRename(p.id)}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(p.id)}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <Check size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800 py-1">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Rename"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a name…"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  )
}
