import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '');

export interface CycleIssue {
  service: string;
  repo: string;
  issueNumber: number;
  title: string;
  category: 'action' | 'plan' | 'warning';
  url: string;
  status: 'open' | 'closed';
}

export interface Cycle {
  id: string;
  planText: string;
  issues: CycleIssue[];
  createdAt: string;
  completedAt?: string;
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toJson = (v: unknown) => sql.json(v as any);

export async function saveCycle(cycle: Cycle) {
  await ensureTable();
  await sql`
    INSERT INTO dashboard_cycles (id, plan_text, issues, created_at, completed_at)
    VALUES (
      ${cycle.id},
      ${cycle.planText},
      ${toJson(cycle.issues)},
      ${cycle.createdAt},
      ${cycle.completedAt ?? null}
    )
    ON CONFLICT (id) DO UPDATE
    SET plan_text = EXCLUDED.plan_text,
        issues = EXCLUDED.issues,
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
  return {
    id: row.id as string,
    planText: row.plan_text as string,
    issues: row.issues as CycleIssue[],
    createdAt: (row.created_at as Date).toISOString(),
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : undefined,
  };
}

export async function updateCycleIssues(id: string, issues: CycleIssue[]) {
  await sql`UPDATE dashboard_cycles SET issues = ${toJson(issues)} WHERE id = ${id}`;
}

export async function markCycleComplete(id: string) {
  await sql`UPDATE dashboard_cycles SET completed_at = NOW() WHERE id = ${id}`;
}
