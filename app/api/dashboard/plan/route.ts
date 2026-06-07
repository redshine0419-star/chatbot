import { NextResponse } from 'next/server';
import { saveCycle } from '@/lib/cycle-store';
import { nanoid } from 'nanoid';

const SERVICES = [
  { key: 'marketerops', url: 'https://growweb.me/api/stats' },
  { key: 'flavorsync', url: 'https://flavorsync.me/api/stats' },
  { key: 'taskgrid', url: 'https://taskgrid.my/api/stats' },
  { key: 'askhistory', url: 'https://askhistory.me/api/stats' },
];

async function fetchStats(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const allStats = await Promise.all(SERVICES.map((s) => fetchStats(s.url)));

    const summary = SERVICES.map((s, i) => {
      const data = allStats[i];
      if (!data) return `${s.key}: 데이터 없음`;
      return [
        `[${s.key}] (${data.domain ?? s.key})`,
        `  블로그 총 ${data.blog?.total ?? 0}개 / 이번 주 ${data.blog?.recentWeek ?? 0}개 신규`,
        data.recipe ? `  레시피 총 ${data.recipe.total}개` : '',
        data.blog?.recent?.length
          ? `  최근 글: ${data.blog.recent.slice(0, 2).map((p: { title: string }) => p.title).join(', ')}`
          : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const prompt = `당신은 데이터 기반 디지털 마케팅 전략가입니다.

아래는 현재 운영 중인 4개 서비스의 현황입니다:

${summary}

위 데이터를 분석하여 아래 JSON 형식으로 정확히 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

{
  "summary": "전체 현황 분석 (2-3문장)",
  "actions": [
    {
      "service": "서비스키(marketerops/flavorsync/taskgrid/askhistory 중 하나)",
      "title": "이슈 제목 (간결하게)",
      "body": "구체적인 실행 방법, 예상 효과, 참고 데이터 포함"
    }
  ],
  "twoWeekPlan": [
    {
      "service": "서비스키",
      "title": "2주 플랜 제목",
      "body": "2주 내 실행할 구체적 콘텐츠/기능 전략"
    }
  ],
  "warnings": [
    {
      "service": "서비스키",
      "title": "주의 신호 제목",
      "body": "문제점, 리스크, 권장 대응 방안"
    }
  ]
}

- actions는 정확히 3개
- twoWeekPlan은 서비스별 1-2개
- warnings는 1-3개
- 각 서비스에 골고루 배분하되 데이터 기반으로 우선순위 결정`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(raw);

    const cycleId = nanoid();
    const planText = JSON.stringify(parsed);
    await saveCycle({
      id: cycleId,
      planText,
      issues: [],
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ cycleId, plan: parsed, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
