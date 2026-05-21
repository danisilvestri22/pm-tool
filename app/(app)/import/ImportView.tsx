'use client'
import { useState } from 'react'
import { Upload, CheckCircle } from 'lucide-react'
import { parseAsanaCSV, type ParsedTask } from '@/lib/asana-parser'
import { importTasks } from '@/app/(app)/actions/import'
import type { Company } from '@/types/database'

interface Props {
  companies: Pick<Company, 'id' | 'name'>[]
}

export default function ImportView({ companies }: Props) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? '')
  const [parsed, setParsed] = useState<ParsedTask[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParsed(null)
    setResult(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const tasks = parseAsanaCSV(text)
      if (tasks.length === 0) {
        setError('No tasks found. Make sure this is an Asana CSV export.')
      } else {
        setParsed(tasks)
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!parsed || !companyId || importing) return
    setImporting(true)
    setError(null)
    const res = await importTasks(companyId, parsed)
    if (res.error) {
      setError(res.error)
    } else {
      setResult({ imported: res.imported })
      setParsed(null)
      setFileName('')
    }
    setImporting(false)
  }

  const inputClass =
    'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Import from Asana</h1>
      <p className="text-sm text-gray-500 mb-6">
        Export your Asana project as CSV, then upload it here.
      </p>

      {result && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-500 shrink-0" size={20} />
          <p className="text-sm text-green-800">
            Imported {result.imported} task{result.imported !== 1 ? 's' : ''} successfully.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Import into</label>
          <select
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            className={inputClass}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Asana CSV file</label>
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition-colors">
            <Upload size={18} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 truncate">
              {fileName || 'Choose a CSV file…'}
            </span>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        </div>

        {parsed && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
            <p className="text-sm text-indigo-800">
              Found <strong>{parsed.length}</strong> task
              {parsed.length !== 1 ? 's' : ''} (
              {parsed.filter(t => t.parentTaskName).length} subtasks)
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleImport}
          disabled={!parsed || importing || !companyId}
          className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? 'Importing…' : 'Import tasks'}
        </button>
      </div>
    </div>
  )
}
