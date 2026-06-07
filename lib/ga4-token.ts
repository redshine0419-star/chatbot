import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function saveGA4Token(tokenData: Record<string, unknown>) {
  await ensureTable();
  await sql`
    INSERT INTO dashboard_settings (key, value, updated_at)
    VALUES ('ga4_token', ${JSON.stringify(tokenData)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export async function getGA4Token(): Promise<Record<string, unknown> | null> {
  try {
    await ensureTable();
    const rows = await sql`SELECT value FROM dashboard_settings WHERE key = 'ga4_token'`;
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].value as string);
  } catch {
    return null;
  }
}
