import Papa from 'papaparse'

export interface ParsedTask {
  name: string
  responsible: string | null
  status: 'on_track' | 'at_risk' | 'completed'
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  notes: string | null
  waiting_on: string | null
  asana_id: string | null
  parentTaskName: string | null
}

function normalizeKey(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

function mapStatus(raw: string): 'on_track' | 'at_risk' | 'completed' {
  const s = raw.toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'atrisk') return 'at_risk'
  if (s === 'completed') return 'completed'
  return 'on_track'
}

function mapPriority(raw: string): 'high' | 'medium' | 'low' {
  const p = raw.toLowerCase()
  if (p === 'high') return 'high'
  if (p === 'low') return 'low'
  return 'medium'
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

    // Use Completed At to override status, otherwise read the Status column
    const completedAt = norm['completed_at'] || norm['completed'] || ''
    let status: ParsedTask['status']
    if (completedAt) {
      status = 'completed'
    } else {
      status = mapStatus(norm['status'] || '')
    }

    const rawDue = norm['due_date'] || norm['due'] || ''
    let due_date: string | null = null
    if (rawDue) {
      const d = new Date(rawDue)
      if (!isNaN(d.getTime())) {
        due_date = d.toISOString().split('T')[0]
      }
    }

    // Dani's Asana exports use "Responsibility" not "Assignee"
    const responsible =
      norm['responsibility'] || norm['assignee_name'] || norm['assignee'] || ''
    const notes = norm['notes'] || norm['description'] || ''
    const waiting_on = norm['waiting_on'] || ''
    const asana_id = norm['task_id'] || norm['id'] || ''
    const parentTaskName = norm['parent_task'] || norm['parent'] || ''
    const priority = mapPriority(norm['priority'] || '')

    rows.push({
      name,
      responsible: responsible || null,
      status,
      priority,
      due_date,
      notes: notes || null,
      waiting_on: waiting_on || null,
      asana_id: asana_id || null,
      parentTaskName: parentTaskName || null,
    })
  }
  return rows
}
