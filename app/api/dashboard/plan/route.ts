import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
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
    // 1. Gather stats
    const statsResults = await Promise.allSettled(
      SERVICES.map(s => fetchStats(s.statsUrl))
    )
    const statsContext = SERVICES.map((s, i) => {
      const data = statsResults[i].status === 'fulfilled' ? statsResults[i].value : null
      return `${s.name} (${s.url}): ${data ? JSON.stringify(data) : '데이터 없음'}`
    }).join('\n')

    // 2. Build Gemini prompt
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set')

    const prompt = `당신은 SaaS 스타트업 AI PM입니다. 아래 4개 서비스 현황을 분석하여 이번 2주 액션 플랜을 JSON으로 반환하세요.

서비스 현황:
${statsContext}

서비스 소개:
- MarketerOps.ai: SEO/마케팅 진단 SaaS, 한국 마케터 타깃
- FlavorSync: 레시피 관리 앱, 냉장고 식재료 기반 추천
- TaskGrid: Google Sheets 기반 칸반 프로젝트 관리 툴
- AskHistory: AI 세계사 학습 플랫폼

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:

{
  "actions": [
    {
      "service": "서비스ID",
      "title": "핵심 액션 제목",
      "body": "왜 이 액션이 필요한지 2-3문장 설명",
      "steps": ["구체적 실행 단계1", "구체적 실행 단계2", "구체적 실행 단계3"],
      "goal": "이 액션 완료 후 기대되는 구체적 결과"
    }
  ],
  "twoWeekPlan": [
    {
      "service": "서비스ID",
      "title": "2주 플랜 제목",
      "body": "실행 방향 2-3문장",
      "steps": ["단계1", "단계2", "단계3"],
      "goal": "2주 후 기대 결과"
    }
  ],
  "warnings": [
    {
      "service": "서비스ID",
      "title": "주의 신호 제목",
      "body": "위험 요소 설명 2-3문장",
      "steps": ["개선 방안1", "개선 방안2", "개선 방안3"],
      "goal": "리스크 해소 후 기대 상태"
    }
  ]
}

규칙:
- actions: 각 서비스 1개씩 총 4개
- twoWeekPlan: 각 서비스 2개씩 총 8개
- warnings: 전체에서 2-3개
- service 필드는 반드시 marketerops, flavorsync, taskgrid, askhistory 중 하나
- steps는 반드시 3개
- 모든 내용은 한국어로`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4000,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      throw new Error(`Gemini error ${geminiRes.status}: ${errText.slice(0, 200)}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Gemini returned empty response')

    let plan: any
    try {
      plan = JSON.parse(rawText)
    } catch {
      throw new Error(`Gemini JSON parse error. Raw: ${rawText.slice(0, 300)}`)
    }

    // 3. Build tasks
    const tasks: CycleTask[] = [
      ...(plan.actions || []).map((a: any, i: number) => ({
        id: `action-${i}`,
        service: a.service,
        title: a.title,
        body: a.body,
        steps: a.steps || [],
        goal: a.goal || '',
        category: 'action' as const,
        done: false,
      })),
      ...(plan.twoWeekPlan || []).map((a: any, i: number) => ({
        id: `plan-${i}`,
        service: a.service,
        title: a.title,
        body: a.body,
        steps: a.steps || [],
        goal: a.goal || '',
        category: 'plan' as const,
        done: false,
      })),
      ...(plan.warnings || []).map((a: any, i: number) => ({
        id: `warning-${i}`,
        service: a.service,
        title: a.title,
        body: a.body,
        steps: a.steps || [],
        goal: a.goal || '',
        category: 'warning' as const,
        done: false,
      })),
    ]

    // 4. Save to DB
    const cycleId = await saveCycle(tasks)

    return NextResponse.json({ cycleId, plan, tasks, generatedAt: new Date().toISOString() })
  } catch (err: any) {
    console.error('[plan] error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
