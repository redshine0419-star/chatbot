import { NextResponse } from 'next/server';

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

    const prompt = `당신은 데이터 기반 디지털 마케팅 전략가입니다.\n\n아래는 현재 운영 중인 4개 서비스의 현황입니다:\n\n${summary}\n\n위 데이터를 분석하여 다음을 작성해주세요:\n\n## 📊 현황 분석\n각 서비스의 콘텐츠 생산성과 성장세를 간략히 평가하세요.\n\n## 🎯 이번 주 핵심 액션 (3가지)\n가장 임팩트가 큰 구체적인 행동 방안을 제시하세요.\n\n## 📅 2주 플랜\n서비스별로 집중할 콘텐츠 전략을 제안하세요.\n\n## ⚠️ 주의 신호\n데이터에서 발견되는 문제점이나 리스크를 짚아주세요.\n\n간결하고 실행 가능한 언어로 작성해주세요.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    const geminiData = await geminiRes.json();
    const plan = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '플랜 생성 실패';

    return NextResponse.json({ plan, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
