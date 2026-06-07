import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '')

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  try {
    let rows
    if (month) {
      rows = await sql`SELECT * FROM dashboard_costs WHERE month = ${month} ORDER BY created_at ASC`
    } else {
      rows = await sql`SELECT * FROM dashboard_costs ORDER BY month DESC, created_at ASC`
    }
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const { month, service, item, amount, currency, note } = await req.json()
  if (!month || !item || amount == null) {
    return NextResponse.json({ error: 'month, item, amount required' }, { status: 400 })
  }
  const rows = await sql`
    INSERT INTO dashboard_costs (month, service, item, amount, currency, note)
    VALUES (${month}, ${service || 'general'}, ${item}, ${amount}, ${currency || 'USD'}, ${note || ''})
    RETURNING *
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await sql`DELETE FROM dashboard_costs WHERE id = ${Number(id)}`
  return NextResponse.json({ ok: true })
}
