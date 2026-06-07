import { NextResponse } from 'next/server'
import { saveCycle, CycleTask } from '@/lib/cycle-store'

const SERVICES = [
  { id: 'marketerops', name: 'MarketerOps.ai', url: 'https://growweb.me', statsUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/stats/marketerops` : null },
  { id: 'flavorsync', name: 'FlavorSync', url: 'https://flavorsync.me', statsUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/stats/flavorsync` : null },
  { id: 'taskgrid', name: 'TaskGrid', url: 'https://taskgrid.my', statsUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/stats/taskgrid` : null },
  { id: 'askhistory', name: 'AskHistory', url: 'https://askhistory.me', statsUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/stats/askhistory` : null },
]

async function fetchStats(url: string | null) {
  if (!url) return null
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function POST() {
  try {
    const statsResults = await Promise.allSettled(
      SERVICES.map(s => fetchStats(s.statsUrl))
    )
    const statsContext = SERVICES.map((s, i) => {
      const data = statsResults[i].status === 'fulfilled' ? statsResults[i].value : null
      return `${s.name}: ${data ? JSON.stringify(data) : '데이터 없음'}`
    }).join('\n')

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set')

    const prompt = `SaaS PM으로서 4개 서비스 현황을 분석해 2주 액션 플랜을 JSON으로 반환하세요.

현황:
${statsContext}

서비스: marketerops=SEO진단SaaS, flavorsync=레시피앱, taskgrid=칸반툴, askhistory=세계사학습

JSON만 반환 (다른 텍스트 없음):
{
  "actions": [{
    "service": "marketerops|flavorsync|taskgrid|askhistory",
    "title": "제목(30자 이내)",
    "body": "설명(100자 이내)",
    "steps": ["단계1(50자)","단계2(50자)","단계3(50자)"],
    "goal": "기대결과(80자 이내)"
  }],
  "twoWeekPlan": [같은 형식 8개],
  "warnings": [같은 형식 2개]
}

규칙: actions=4개(서비스별1개), twoWeekPlan=8개(서비스별2개), warnings=2개. 한국어.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      throw new Error(`Gemini ${geminiRes.status}: ${errText.slice(0, 200)}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Gemini returned empty response')

    let plan: any
    try {
      plan = JSON.parse(rawText)
    } catch (e: any) {
      throw new Error(`JSON parse error: ${e.message}. Raw (first 500): ${rawText.slice(0, 500)}`)
    }

    const tasks: CycleTask[] = [
      ...(plan.actions || []).map((a: any, i: number) => ({
        id: `action-${i}`, service: a.service, title: a.title, body: a.body,
        steps: a.steps || [], goal: a.goal || '', category: 'action' as const, done: false,
      })),
      ...(plan.twoWeekPlan || []).map((a: any, i: number) => ({
        id: `plan-${i}`, service: a.service, title: a.title, body: a.body,
        steps: a.steps || [], goal: a.goal || '', category: 'plan' as const, done: false,
      })),
      ...(plan.warnings || []).map((a: any, i: number) => ({
        id: `warning-${i}`, service: a.service, title: a.title, body: a.body,
        steps: a.steps || [], goal: a.goal || '', category: 'warning' as const, done: false,
      })),
    ]

    const cycleId = await saveCycle(tasks)
    return NextResponse.json({ cycleId, plan, tasks, generatedAt: new Date().toISOString() })
  } catch (err: any) {
    console.error('[plan] error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
