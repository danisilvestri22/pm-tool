export type Status = 'not_started' | 'in_progress' | 'waiting_on_response' | 'blocked' | 'at_risk' | 'done'
export type Priority = 'high' | 'medium' | 'low'
export type BoardColumn = 'todo' | 'in_progress' | 'done'

export interface Company {
  id: string
  name: string
  created_at: string
  created_by: string | null
}

export interface Task {
  id: string
  company_id: string
  parent_task_id: string | null
  name: string
  responsible: string | null
  status: Status
  priority: Priority
  due_date: string | null
  followup_date: string | null
  waiting_on: string | null
  notes: string | null
  board_column: BoardColumn
  deleted_at: string | null
  asana_id: string | null
  created_at: string
  updated_at: string
  subtasks?: Task[]
}

export interface ShareLink {
  id: string
  token: string
  company_id: string | null
  label: string | null
  active: boolean
  created_at: string
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  subscription: Record<string, unknown>
  created_at: string
}
