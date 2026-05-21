import Papa from 'papaparse'

export interface ParsedTask {
  name: string
  responsible: string | null
  status: 'on_track' | 'at_risk' | 'completed'
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  notes: string | null
  asana_id: string | null
  parentTaskName: string | null
}

function normalizeKey(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

export function parseAsanaCSV(csvText: string): ParsedTask[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  const rows: ParsedTask[] = []
  for (const row of result.data) {
    const norm: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      norm[normalizeKey(k)] = (v ?? '').trim()
    }

    const name = norm['name'] || norm['task_name'] || ''
    if (!name) continue

    const completedAt = norm['completed_at'] || norm['completed'] || ''
    const status: ParsedTask['status'] = completedAt ? 'completed' : 'on_track'

    const rawDue = norm['due_date'] || norm['due'] || ''
    let due_date: string | null = null
    if (rawDue) {
      const d = new Date(rawDue)
      if (!isNaN(d.getTime())) {
        due_date = d.toISOString().split('T')[0]
      }
    }

    const responsible = norm['assignee_name'] || norm['assignee'] || ''
    const notes = norm['notes'] || norm['description'] || ''
    const asana_id = norm['task_id'] || norm['id'] || ''
    const parentTaskName = norm['parent_task'] || norm['parent'] || ''

    rows.push({
      name,
      responsible: responsible || null,
      status,
      priority: 'medium',
      due_date,
      notes: notes || null,
      asana_id: asana_id || null,
      parentTaskName: parentTaskName || null,
    })
  }
  return rows
}
