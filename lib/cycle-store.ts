import { sql } from '@/lib/db'

export interface CycleTask {
  id: string
  service: string
  title: string
  body: string
  steps?: string[]
  goal?: string
  category: 'action' | 'plan' | 'warning'
  done: boolean
}

export interface Cycle {
  id: number
  createdAt: string
  completedAt: string | null
  tasks: CycleTask[]
}

const toJson = (v: unknown) => sql.json(v as any)

function rowToTasks(row: any): CycleTask[] {
  const raw = row.issues
  if (!raw) return []
  if (Array.isArray(raw)) {
    // New format: CycleTask[]
    if (raw.length > 0 && 'done' in raw[0]) return raw as CycleTask[]
    // Old format: CycleIssue[] with status field
    return (raw as any[]).map((issue: any) => ({
      id: String(issue.number || issue.id || Math.random()),
      service: issue.service || 'unknown',
      title: issue.title || '',
      body: issue.body || '',
      steps: issue.steps,
      goal: issue.goal,
      category: issue.category || 'action',
      done: issue.status === 'closed' || issue.done === true,
    }))
  }
  return []
}

export async function getCurrentCycle(): Promise<Cycle | null> {
  const rows = await sql`
    SELECT id, created_at, completed_at, issues
    FROM dashboard_cycles
    ORDER BY id DESC
    LIMIT 1
  `
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    tasks: rowToTasks(row),
  }
}

export async function saveCycle(tasks: CycleTask[]): Promise<number> {
  const rows = await sql`
    INSERT INTO dashboard_cycles (issues)
    VALUES (${toJson(tasks)})
    RETURNING id
  `
  return rows[0].id
}

export async function toggleTask(cycleId: number, taskId: string): Promise<CycleTask[]> {
  const rows = await sql`SELECT issues FROM dashboard_cycles WHERE id = ${cycleId}`
  if (rows.length === 0) throw new Error('Cycle not found')
  const tasks: CycleTask[] = rowToTasks(rows[0])
  const updated = tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
  const allDone = updated.every(t => t.done)
  if (allDone) {
    await sql`
      UPDATE dashboard_cycles
      SET issues = ${toJson(updated)}, completed_at = NOW()
      WHERE id = ${cycleId}
    `
  } else {
    await sql`
      UPDATE dashboard_cycles
      SET issues = ${toJson(updated)}, completed_at = NULL
      WHERE id = ${cycleId}
    `
  }
  return updated
}
