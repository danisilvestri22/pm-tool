import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import fs from 'fs'

const SUPABASE_URL = 'https://gglvlgvglzhatqzrbqtx.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbHZsZ3ZnbHpoYXRxenJicXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg5OTg2MCwiZXhwIjoyMDk0NDc1ODYwfQ.ALE9oeILcwE8H-JM-3Ee-1P7S1fsT_I4Sqoks0nMSCk'
const DANI_EMAIL = 'daniellesilvestri@gmail.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function normalizeKey(h) { return h.toLowerCase().replace(/[^a-z0-9]/g, '_') }
function mapStatus(raw) {
  const s = raw.toLowerCase().replace(/[^a-z]/g, '')
  if (s === 'atrisk') return 'at_risk'
  if (s === 'completed') return 'completed'
  return 'on_track'
}
function mapPriority(raw) {
  const p = raw.toLowerCase()
  if (p === 'high') return 'high'
  if (p === 'low') return 'low'
  return 'medium'
}
function parseDate(raw) {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() })
  const rows = []
  for (const row of result.data) {
    const norm = {}
    for (const [k, v] of Object.entries(row)) norm[normalizeKey(k)] = (v ?? '').trim()
    const name = norm['name'] || ''
    if (!name) continue
    const completedAt = norm['completed_at'] || ''
    rows.push({
      name,
      responsible: norm['responsibility'] || norm['assignee'] || null,
      status: completedAt ? 'completed' : mapStatus(norm['status'] || ''),
      priority: mapPriority(norm['priority'] || ''),
      due_date: parseDate(norm['due_date'] || ''),
      notes: norm['notes'] || null,
      waiting_on: norm['waiting_on'] || null,
      asana_id: norm['task_id'] || null,
      parentTaskName: norm['parent_task'] || null,
    })
  }
  return rows
}

async function insertTasks(companyId, tasks) {
  const topLevel = tasks.filter(t => !t.parentTaskName)
  const subtasks = tasks.filter(t => t.parentTaskName)

  const { data: inserted, error } = await supabase.from('tasks')
    .insert(topLevel.map(t => ({ company_id: companyId, name: t.name, responsible: t.responsible || null, status: t.status, priority: t.priority, due_date: t.due_date, notes: t.notes, waiting_on: t.waiting_on || null, asana_id: t.asana_id })))
    .select('id, name')
  if (error) { console.error('  Insert error:', error.message); return }

  const nameToId = {}
  for (const t of inserted ?? []) nameToId[t.name] = t.id

  if (subtasks.length > 0) {
    const { error: subErr } = await supabase.from('tasks').insert(
      subtasks.map(t => ({
        company_id: companyId,
        name: t.name,
        responsible: t.responsible || null,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        notes: t.notes,
        waiting_on: t.waiting_on || null,
        asana_id: t.asana_id,
        parent_task_id: t.parentTaskName ? (nameToId[t.parentTaskName] ?? null) : null,
      }))
    )
    if (subErr) console.error('  Subtask insert error:', subErr.message)
  }

  console.log(`  ✓ ${(inserted?.length ?? 0) + subtasks.length} tasks imported`)
}

async function main() {
  // Get Dani's user ID
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const dani = users.find(u => u.email === DANI_EMAIL)
  if (!dani) { console.error('User not found'); process.exit(1) }
  const userId = dani.id
  console.log('Found user:', DANI_EMAIL)

  // Check existing companies
  const { data: existing } = await supabase.from('companies').select('id, name')
  const existingNames = new Set((existing ?? []).map(c => c.name))

  async function getOrCreateCompany(name) {
    if (existingNames.has(name)) {
      const c = existing.find(c => c.name === name)
      console.log(`\nCompany "${name}" already exists`)
      return c.id
    }
    const { data, error } = await supabase.from('companies')
      .insert({ name, created_by: userId })
      .select('id')
      .single()
    if (error) { console.error('Failed to create company:', error.message); return null }
    console.log(`\nCreated company "${name}"`)
    return data.id
  }

  // Oracle
  const oracleId = await getOrCreateCompany('Oracle')
  if (oracleId) {
    const tasks = parseCSV('/Users/daniellesilvestri/Downloads/Oracle.csv')
    await insertTasks(oracleId, tasks)
  }

  // Limetec — CSV tasks + subtasks from Dani.csv
  const limetecId = await getOrCreateCompany('Limetec')
  if (limetecId) {
    const csvTasks = parseCSV('/Users/daniellesilvestri/Downloads/Limetec.csv')
    const daniTasks = parseCSV('/Users/daniellesilvestri/Downloads/Dani.csv')
    const limetecDaniTasks = daniTasks.filter(t =>
      t.name === 'Limetec - keep video project moving' ||
      t.parentTaskName === 'Limetec - keep video project moving'
    )
    await insertTasks(limetecId, [...csvTasks, ...limetecDaniTasks])
  }

  // MoGo
  const mogoId = await getOrCreateCompany('MoGo')
  if (mogoId) {
    const tasks = parseCSV('/Users/daniellesilvestri/Downloads/MoGo.csv')
    await insertTasks(mogoId, tasks)
  }

  // Graphcoa
  const graphcoaId = await getOrCreateCompany('Graphcoa')
  if (graphcoaId) {
    const tasks = parseCSV('/Users/daniellesilvestri/Downloads/Graphcoa.csv')
    await insertTasks(graphcoaId, tasks)
  }

  // SmartKable — task from Dani.csv
  const smartkableId = await getOrCreateCompany('SmartKable')
  if (smartkableId) {
    const daniTasks = parseCSV('/Users/daniellesilvestri/Downloads/Dani.csv')
    const skTasks = daniTasks.filter(t => t.name === 'Schedule call for SmartKable')
    await insertTasks(smartkableId, skTasks)
  }

  console.log('\nDone!')
}

main().catch(console.error)
