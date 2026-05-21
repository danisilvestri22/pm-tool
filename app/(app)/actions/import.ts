'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ParsedTask } from '@/lib/asana-parser'

export async function importTasks(
  companyId: string,
  tasks: ParsedTask[],
): Promise<{ imported: number; error?: string }> {
  if (!companyId || tasks.length === 0) return { imported: 0, error: 'No tasks to import' }

  const supabase = await createClient()

  const topLevel = tasks.filter(t => !t.parentTaskName)
  const subtasks = tasks.filter(t => t.parentTaskName)

  const topLevelRows = topLevel.map(t => ({
    company_id: companyId,
    name: t.name,
    responsible: t.responsible,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    notes: t.notes,
    asana_id: t.asana_id,
    parent_task_id: null as string | null,
  }))

  const { data: inserted, error: topErr } = await supabase
    .from('tasks')
    .insert(topLevelRows)
    .select('id, name')
  if (topErr) return { imported: 0, error: 'Failed to import tasks' }

  const nameToId: Record<string, string> = {}
  for (const t of inserted ?? []) {
    nameToId[t.name] = t.id
  }

  let subtaskCount = 0
  if (subtasks.length > 0) {
    const subtaskRows = subtasks.map(t => ({
      company_id: companyId,
      name: t.name,
      responsible: t.responsible,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      notes: t.notes,
      asana_id: t.asana_id,
      parent_task_id: t.parentTaskName ? (nameToId[t.parentTaskName] ?? null) : null,
    }))

    const { data: insertedSubs } = await supabase
      .from('tasks')
      .insert(subtaskRows)
      .select('id')
    subtaskCount = insertedSubs?.length ?? 0
  }

  revalidatePath('/', 'layout')
  return { imported: (inserted?.length ?? 0) + subtaskCount }
}
