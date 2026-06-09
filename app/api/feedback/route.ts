import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'

const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '')

const ALLOWED_SERVICES = ['marketerops', 'flavorsync', 'taskgrid', 'askhistory']
const MAX_CONTENT_LEN = 1000
const MAX_NICKNAME_LEN = 30
// IP당 10분에 3개 제한
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 3

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS service_feedback (
      id SERIAL PRIMARY KEY,
      service TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '익명',
      content TEXT NOT NULL,
      ip_hash TEXT NOT NULL DEFAULT '',
      is_hidden BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  // ip_hash 인덱스 (레이트 리밋용)
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_ip_hash ON service_feedback(ip_hash, created_at)`
}

function hashIp(ip: string): string {
  // 단순 해시 (추적 불가, 레이트리밋 용도)
  let h = 0
  for (let i = 0; i < ip.length; i++) h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? '0'
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const service = req.nextUrl.searchParams.get('service')
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
  const pageSize = 20
  const offset = (page - 1) * pageSize

  try {
    const rows = service && ALLOWED_SERVICES.includes(service)
      ? await sql`
          SELECT id, service, nickname, content, created_at
          FROM service_feedback
          WHERE service = ${service} AND is_hidden = false
          ORDER BY created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `
      : await sql`
          SELECT id, service, nickname, content, created_at
          FROM service_feedback
          WHERE is_hidden = false
          ORDER BY created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `

    const [{ count }] = service && ALLOWED_SERVICES.includes(service)
      ? await sql`SELECT COUNT(*)::int AS count FROM service_feedback WHERE service = ${service} AND is_hidden = false`
      : await sql`SELECT COUNT(*)::int AS count FROM service_feedback WHERE is_hidden = false`

    return NextResponse.json({ rows, total: count, page, pageSize })
  } catch {
    return NextResponse.json({ rows: [], total: 0, page: 1, pageSize })
  }
}

export async function POST(req: NextRequest) {
  await ensureTable()

  const ip = getIp(req)
  const ipHash = hashIp(ip)

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 }) }

  const { service, nickname, content, captchaAnswer, captchaQuestion, honeypot } = body

  // 허니팟: 봇이 채우는 숨김 필드
  if (honeypot) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  // 서비스 검증
  if (!service || !ALLOWED_SERVICES.includes(service))
    return NextResponse.json({ error: '서비스를 선택해주세요.' }, { status: 400 })

  // 내용 검증
  const cleanContent = String(content ?? '').trim()
  if (!cleanContent || cleanContent.length < 5)
    return NextResponse.json({ error: '5자 이상 입력해주세요.' }, { status: 400 })
  if (cleanContent.length > MAX_CONTENT_LEN)
    return NextResponse.json({ error: `최대 ${MAX_CONTENT_LEN}자까지 가능합니다.` }, { status: 400 })

  // 닉네임
  const cleanNickname = String(nickname ?? '').trim().slice(0, MAX_NICKNAME_LEN) || '익명'

  // 수학 캡차 검증
  const { a, op, b } = parseCaptcha(captchaQuestion ?? '')
  const expected = op === '+' ? a + b : a - b
  if (Number(captchaAnswer) !== expected)
    return NextResponse.json({ error: '자동 입력 방지 답이 틀렸습니다.' }, { status: 400 })

  // IP 레이트 리밋
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  const [{ count: recentCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM service_feedback
    WHERE ip_hash = ${ipHash} AND created_at > ${since}
  `
  if (recentCount >= RATE_LIMIT_MAX)
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요. (10분에 3개 제한)' }, { status: 429 })

  try {
    const [row] = await sql`
      INSERT INTO service_feedback (service, nickname, content, ip_hash)
      VALUES (${service}, ${cleanNickname}, ${cleanContent}, ${ipHash})
      RETURNING id, service, nickname, content, created_at
    `
    return NextResponse.json({ ok: true, row })
  } catch {
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }
}

// 관리자 삭제 (간단히 ADMIN_SECRET 헤더로 보호)
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await ensureTable()
  await sql`UPDATE service_feedback SET is_hidden = true WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}

function parseCaptcha(q: string): { a: number; op: '+' | '-'; b: number } {
  const m = q.match(/(\d+)\s*([+\-])\s*(\d+)/)
  if (!m) return { a: 0, op: '+', b: 0 }
  return { a: Number(m[1]), op: m[2] as '+' | '-', b: Number(m[3]) }
}
