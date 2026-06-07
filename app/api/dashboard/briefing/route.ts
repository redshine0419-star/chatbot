import { NextResponse } from 'next/server';
import { getGA4Token } from '@/lib/ga4-token';

const SERVICES = [
  { service: 'marketerops', repo: 'saasclaude', statsUrl: 'https://growweb.me/api/stats' },
  { service: 'flavorsync',  repo: 'done',       statsUrl: 'https://flavorsync.me/api/stats' },
  { service: 'taskgrid',   repo: 'taskflow',    statsUrl: 'https://www.taskgrid.my/api/stats' },
  { service: 'askhistory', repo: 'history',     statsUrl: 'https://askhistory.me/api/stats' },
];

const GA4_PROPS: Record<string, string> = {
  marketerops: '538101783',
  flavorsync:  '539541349',
  taskgrid:    '540455600',
  askhistory:  '540450852',
};

const NAMES: Record<string, string> = {
  marketerops: 'MarketerOps',
  flavorsync:  'FlavorSync',
  taskgrid:    'TaskGrid',
  askhistory:  'AskHistory',
};

async function getCommits(repo: string): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];
  try {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const res = await fetch(
      `https://api.github.com/repos/redshine0419-star/${repo}/commits?since=${since}&per_page=5`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json() as Array<{ commit: { message: string } }>;
    return data.map(c => c.commit.message.split('\n')[0]).filter(m => !m.startsWith('Merge'));
  } catch { return []; }
}

async function getGA4Yesterday(propId: string, token: string) {
  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        }),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const d = await res.json() as { rows?: Array<{ metricValues: Array<{ value: string }> }> };
    const row = d.rows?.[0]?.metricValues;
    return row ? { sessions: parseInt(row[0].value ?? '0'), users: parseInt(row[1].value ?? '0') } : { sessions: 0, users: 0 };
  } catch { return null; }
}

export async function GET() {
  try {
    const today = new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const [statsResults, commitResults] = await Promise.all([
      Promise.allSettled(SERVICES.map(async s => {
        const r = await fetch(s.statsUrl, { cache: 'no-store' });
        if (!r.ok) throw new Error('failed');
        return { service: s.service, ...(await r.json() as Record<string, unknown>) };
      })),
      Promise.allSettled(SERVICES.map(async s => ({ service: s.service, commits: await getCommits(s.repo) }))),
    ]);

    const statsMap: Record<string, Record<string, unknown>> = {};
    for (const r of statsResults)
      if (r.status === 'fulfilled') statsMap[r.value.service] = r.value;

    const commitMap: Record<string, string[]> = {};
    for (const r of commitResults)
      if (r.status === 'fulfilled') commitMap[r.value.service] = r.value.commits;

    const tokenData = await getGA4Token();
    const ga4Map: Record<string, { sessions: number; users: number }> = {};
    if (tokenData?.access_token) {
      const ga4Results = await Promise.allSettled(
        SERVICES.map(async s => ({ service: s.service, data: await getGA4Yesterday(GA4_PROPS[s.service], tokenData.access_token as string) }))
      );
      for (const r of ga4Results)
        if (r.status === 'fulfilled' && r.value.data) ga4Map[r.value.service] = r.value.data;
    }

    const context = SERVICES.map(s => {
      const blog = (statsMap[s.service]?.blog as Record<string, unknown>) ?? {};
      const ga4  = ga4Map[s.service];
      const commits = commitMap[s.service] ?? [];
      return [
        `[${NAMES[s.service]}]`,
        `블로그 총 ${blog.total ?? '?'}개 / 이번 주 신규 ${blog.recentWeek ?? '?'}개`,
        ga4 ? `어제 트래픽: 세션 ${ga4.sessions}회, 사용자 ${ga4.users}명` : '어제 트래픽: 데이터 없음',
        commits.length > 0 ? `최근 커밋: ${commits.slice(0, 2).join(' / ')}` : '최근 개발 없음',
      ].join('\n');
    }).join('\n\n');

    const prompt = `당신은 4개 웹서비스를 운영하는 1인 창업자의 AI PM 비서입니다.
오늘 ${today} 아침 브리핑을 작성해주세요.

어제 현황:
${context}

요청:
- 600자 이내로 간결하게
- TTS로 읽어드릴 예정이므로 자연스럽게
- 인사 → 서비스별 핵심 → 오늘 집중사항 1가지 → 마무리
- 숫자가 0이어도 솔직하게
- 한국어로`;

    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 600 } }),
        cache: 'no-store',
      }
    );

    let briefing = '브리핑 생성에 실패했습니다.';
    if (gRes.ok) {
      const gd = await gRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      briefing = gd.candidates?.[0]?.content?.parts?.[0]?.text ?? briefing;
    }

    return NextResponse.json({ briefing, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
