import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '');

export interface CycleTask {
  id: string;
  service: string;
  title: string;
  body: string;
  category: 'action' | 'plan' | 'warning';
  done: boolean;
}

export interface Cycle {
  id: string;
  planText: string;
  tasks: CycleTask[];
  createdAt: string;
  completedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJson = (v: unknown) => sql.json(v as any);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_cycles (
      id TEXT PRIMARY KEY,
      plan_text TEXT NOT NULL,
      issues JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `;
}

function rowToTasks(raw: unknown[]): CycleTask[] {
  return raw
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t, i) => ({
      id: (t.id as string) ?? `task-${i}`,
      service: (t.service as string) ?? '',
      title: (t.title as string) ?? '',
      body: (t.body as string) ?? '',
      category: (t.category as 'action' | 'plan' | 'warning') ?? 'action',
      // 구버전(CycleIssue) 호환: status === 'closed' → done
      done: 'done' in t ? Boolean(t.done) : (t.status as string) === 'closed',
    }));
}

export async function saveCycle(cycle: Cycle) {
  await ensureTable();
  await sql`
    INSERT INTO dashboard_cycles (id, plan_text, issues, created_at, completed_at)
    VALUES (
      ${cycle.id},
      ${cycle.planText},
      ${toJson(cycle.tasks)},
      ${cycle.createdAt},
      ${cycle.completedAt ?? null}
    )
    ON CONFLICT (id) DO UPDATE
    SET plan_text = EXCLUDED.plan_text,
        issues    = EXCLUDED.issues,
        completed_at = EXCLUDED.completed_at
  `;
}

export async function getCurrentCycle(): Promise<Cycle | null> {
  await ensureTable();
  const rows = await sql`
    SELECT * FROM dashboard_cycles
    WHERE completed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  const tasks = rowToTasks((row.issues as unknown[]) ?? []);
  return {
    id: row.id as string,
    planText: row.plan_text as string,
    tasks,
    createdAt: (row.created_at as Date).toISOString(),
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : undefined,
  };
}

export async function toggleTask(cycleId: string, taskId: string): Promise<{ tasks: CycleTask[]; allDone: boolean } | null> {
  await ensureTable();
  const rows = await sql`SELECT issues FROM dashboard_cycles WHERE id = ${cycleId}`;
  if (rows.length === 0) return null;

  const tasks = rowToTasks((rows[0].issues as unknown[]) ?? []);
  const updated = tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);

  await sql`UPDATE dashboard_cycles SET issues = ${toJson(updated)} WHERE id = ${cycleId}`;

  const allDone = updated.length > 0 && updated.every(t => t.done);
  if (allDone) {
    await sql`UPDATE dashboard_cycles SET completed_at = NOW() WHERE id = ${cycleId}`;
  }
  return { tasks: updated, allDone };
}

export async function markCycleComplete(id: string) {
  await sql`UPDATE dashboard_cycles SET completed_at = NOW() WHERE id = ${id}`;
}
