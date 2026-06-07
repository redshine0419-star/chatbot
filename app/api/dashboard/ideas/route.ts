import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_ideas (
      service TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await sql`SELECT service, content, updated_at FROM dashboard_ideas`;
    const result: Record<string, { content: string; updatedAt: string }> = {};
    for (const row of rows) {
      result[row.service as string] = {
        content: row.content as string,
        updatedAt: (row.updated_at as Date).toISOString(),
      };
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { service, content } = await req.json();
    if (!service) return NextResponse.json({ error: 'service required' }, { status: 400 });
    await ensureTable();
    await sql`
      INSERT INTO dashboard_ideas (service, content, updated_at)
      VALUES (${service}, ${content ?? ''}, NOW())
      ON CONFLICT (service) DO UPDATE
      SET content = EXCLUDED.content, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
