import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const SERVICES = [
  { key: 'marketerops', url: 'https://growweb.me/api/stats' },
  { key: 'flavorsync', url: 'https://flavorsync.me/api/stats' },
  { key: 'taskgrid', url: 'https://taskgrid.my/api/stats' },
  { key: 'askhistory', url: 'https://askhistory.me/api/stats' },
];

async function fetchStats(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
        `[${s.key}] (${data.domain})`,
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

위 데이터를 분석하여 다음을 작성해주세요:

## 📊 현황 분석
각 서비스의 콘텐츠 생산성과 성장세를 간략히 평가하세요.

## 🎯 이번 주 핵심 액션 (3가지)
가장 임팩트가 큰 구체적인 행동 방안을 제시하세요.

## 📅 2주 플랜
서비스별로 집중할 콘텐츠 전략을 제안하세요.

## ⚠️ 주의 신호
데이터에서 발견되는 문제점이나 리스크를 짚어주세요.

간결하고 실행 가능한 언어로 작성해주세요.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const plan = result.response.text();

    return NextResponse.json({ plan, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
