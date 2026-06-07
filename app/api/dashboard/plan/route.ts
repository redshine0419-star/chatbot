import { NextResponse } from 'next/server';
import { saveCycle, type CycleTask } from '@/lib/cycle-store';

const SERVICES = ['marketerops', 'flavorsync', 'taskgrid', 'askhistory'];
const SERVICE_NAMES: Record<string, string> = {
  marketerops: 'MarketerOps.ai',
  flavorsync: 'FlavorSync',
  taskgrid: 'TaskGrid',
  askhistory: 'AskHistory',
};
const STATS_URLS: Record<string, string> = {
  marketerops: 'https://growweb.me/api/stats',
  flavorsync:  'https://flavorsync.me/api/stats',
  taskgrid:    'https://www.taskgrid.my/api/stats',
  askhistory:  'https://askhistory.me/api/stats',
};

export async function POST() {
  try {
    // 현황 수집
    const statsResults = await Promise.allSettled(
      SERVICES.map(async svc => {
        try {
          const r = await fetch(STATS_URLS[svc], { cache: 'no-store' });
          if (!r.ok) return { service: svc, blog: { total: '?', recentWeek: '?' } };
          return { service: svc, ...(await r.json() as Record<string, unknown>) };
        } catch {
          return { service: svc, blog: { total: '?', recentWeek: '?' } };
        }
      })
    );
    const statsContext = statsResults
      .filter(r => r.status === 'fulfilled')
      .map(r => {
        const v = (r as PromiseFulfilledResult<Record<string, unknown>>).value;
        const blog = (v.blog as Record<string, unknown>) ?? {};
        return `${SERVICE_NAMES[v.service as string]}: 블로그 총 ${blog.total ?? '?'}개, 이번 주 신규 ${blog.recentWeek ?? '?'}개`;
      })
      .join('\n');

    const prompt = `당신은 4개 웹서비스의 AI PM입니다. SEO와 AdSense 수익을 높이는 것이 목표입니다.

현재 현황:
${statsContext}

이번 주 ~ 2주간 실행 계획을 아래 JSON 형식으로 작성해주세요:
{
  "summary": "전체 상황 요약 (2문장)",
  "actions": [
    {"service": "marketerops|flavorsync|taskgrid|askhistory", "title": "제목(30자 이내)", "body": "구체적 실행 방법"}
  ],
  "twoWeekPlan": [...],
  "warnings": [...]
}

규칙:
- actions: 정확히 4개 (서비스마다 1개, 이번 주 즉시 실행)
- twoWeekPlan: 8개 (서비스마다 2개, 2주 내 실행)
- warnings: 2~3개 (리스크·주의사항)
- 블로그 SEO 키워드, 콘텐츠 품질, AdSense 광고 배치 중심
- 한국어로 작성`;

    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2000 },
        }),
        cache: 'no-store',
      }
    );
    if (!gRes.ok) throw new Error(`Gemini ${gRes.status}`);

    const gData = await gRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = gData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const plan = JSON.parse(text) as {
      summary: string;
      actions: Array<{ service: string; title: string; body: string }>;
      twoWeekPlan: Array<{ service: string; title: string; body: string }>;
      warnings: Array<{ service: string; title: string; body: string }>;
    };

    // 태스크 생성
    let idx = 0;
    const tasks: CycleTask[] = [
      ...(plan.actions     ?? []).map(a => ({ id: `t${++idx}`, ...a, category: 'action'  as const, done: false })),
      ...(plan.twoWeekPlan ?? []).map(a => ({ id: `t${++idx}`, ...a, category: 'plan'    as const, done: false })),
      ...(plan.warnings    ?? []).map(a => ({ id: `t${++idx}`, ...a, category: 'warning' as const, done: false })),
    ];

    const cycleId = `cycle-${Date.now()}`;
    await saveCycle({ id: cycleId, planText: text, tasks, createdAt: new Date().toISOString() });

    return NextResponse.json({ cycleId, plan, tasks, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
