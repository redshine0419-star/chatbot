'use client';

import { useEffect, useState, useCallback } from 'react';

interface RecentPost {
  title?: string; slug?: string; id?: string | number;
  createdAt?: string; publishedAt?: string; date?: string;
}
interface ServiceStats {
  service: string; domain: string;
  blog: { total: number; recentWeek: number; recent: RecentPost[]; ko?: number; en?: number; ja?: number };
  recipe?: { total: number }; updatedAt: string; error?: string;
}
interface GA4Data {
  property: string; domain: string;
  sessions: number; users: number; pageViews: number;
  topPages: Array<{ page: string; views: number }>;
}
interface CycleTask {
  id: string; service: string; title: string; body: string;
  category: 'action' | 'plan' | 'warning'; done: boolean;
}
interface CycleStatus {
  hasCycle: boolean; allDone: boolean; doneCount: number; totalCount: number;
  cycle?: { id: string; tasks: CycleTask[]; createdAt: string; completedAt?: string };
}

const SERVICE_COLORS: Record<string, string> = {
  marketerops: 'bg-violet-500', flavorsync: 'bg-orange-500',
  taskgrid: 'bg-blue-500', askhistory: 'bg-emerald-500',
};
const SERVICE_LABELS: Record<string, string> = {
  marketerops: 'MarketerOps.ai', flavorsync: 'FlavorSync',
  taskgrid: 'TaskGrid', askhistory: 'AskHistory',
};
const CATEGORY_STYLES: Record<string, { label: string; border: string; text: string; bg: string }> = {
  action:  { label: '🎯 핵심액션', text: 'text-violet-300', border: 'border-violet-700/60', bg: 'bg-violet-900/20' },
  plan:    { label: '📅 2주플랜',  text: 'text-blue-300',   border: 'border-blue-700/60',   bg: 'bg-blue-900/20' },
  warning: { label: '⚠️ 주의신호', text: 'text-yellow-300', border: 'border-yellow-700/60', bg: 'bg-yellow-900/20' },
};

const ARCH_DATA = [
  {
    service: 'marketerops', name: 'MarketerOps.ai', domain: 'growweb.me',
    framework: 'Next.js 16 App Router', db: 'Neon PostgreSQL (Free)', auth: 'NextAuth 5 + Google OAuth',
    ai: 'Gemini 2.5 Flash + Claude Sonnet (폴백)', hosting: 'Vercel Pro',
    extras: ['Vercel Blob', 'PageSpeed API', 'GA4 API', 'GSC API'],
    costs: [
      { item: 'Vercel Pro', usd: 20, est: false, note: '$20 크레딧 / 실사용 ~$0.68' },
      { item: 'Neon DB',    usd: 0,  est: false, note: '무료 티어 (0.5GB)' },
      { item: 'Gemini API', usd: 1,  est: true,  note: '2.5 Flash' },
      { item: 'Claude API', usd: 0,  est: true,  note: '폴백만, ~$0' },
    ],
  },
  {
    service: 'flavorsync', name: 'FlavorSync', domain: 'flavorsync.me',
    framework: 'Next.js 15 App Router', db: 'Neon PostgreSQL (Free)', auth: 'NextAuth v4 + Google OAuth',
    ai: 'Gemini 2.5 Flash', hosting: 'Vercel',
    extras: ['PWA', 'YouTube API (레시피 분석)'],
    costs: [
      { item: 'Vercel',     usd: 0, est: true,  note: 'Hobby/Free' },
      { item: 'Neon DB',    usd: 0, est: false, note: '무료 티어' },
      { item: 'Gemini API', usd: 1, est: true,  note: '블로그 자동생성' },
    ],
  },
  {
    service: 'taskgrid', name: 'TaskGrid', domain: 'taskgrid.my',
    framework: 'Next.js 15 App Router', db: 'Neon PostgreSQL + Google Sheets', auth: 'Google OAuth 2.0',
    ai: 'Gemini 2.5 Flash', hosting: 'Vercel',
    extras: ['Google Sheets API v4'],
    costs: [
      { item: 'Vercel',     usd: 0, est: true,  note: 'Hobby/Free' },
      { item: 'Neon DB',    usd: 0, est: false, note: '무료 티어' },
      { item: 'Gemini API', usd: 1, est: true,  note: '블로그 자동생성' },
    ],
  },
  {
    service: 'askhistory', name: 'AskHistory', domain: 'askhistory.me',
    framework: 'Next.js App Router', db: 'PostgreSQL', auth: 'Google OAuth',
    ai: 'Gemini 2.5 Flash', hosting: 'Vercel',
    extras: [],
    costs: [
      { item: 'Vercel',     usd: 0, est: true,  note: 'Hobby/Free' },
      { item: 'DB',         usd: 0, est: false, note: '무료 티어' },
      { item: 'Gemini API', usd: 1, est: true,  note: '콘텐츠 생성' },
    ],
  },
];

function stripMarkdown(t: string) {
  return t.replace(/#{1,6}\s+/g,'').replace(/\*\*([^*]+)\*\*/g,'$1')
    .replace(/\*([^*]+)\*/g,'$1').replace(/[-*+]\s+/g,'').replace(/\n\n+/g,'\n').trim();
}
function getPostDate(post: RecentPost) {
  const raw = post.createdAt ?? post.publishedAt ?? post.date;
  if (!raw) return '';
  try { return new Date(raw).toLocaleDateString('ko-KR',{month:'short',day:'numeric'}); } catch { return String(raw).slice(0,10); }
}
function getPostTitle(post: RecentPost) { return post.title ?? post.slug ?? String(post.id ?? ''); }

type Tab = 'overview' | 'cycle' | 'ideas' | 'costs' | 'briefing';

export default function DashboardPage() {
  const [stats, setStats]           = useState<ServiceStats[]>([]);
  const [ga4Data, setGa4Data]       = useState<GA4Data[]>([]);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus | null>(null);
  const [tab, setTab]               = useState<Tab>('overview');
  const [toggling, setToggling]     = useState<string | null>(null);

  // 아이디어
  const [ideas, setIdeas]           = useState<Record<string, string>>({});
  const [ideasSaving, setIdeasSaving] = useState<string | null>(null);

  // 모닝 브리핑
  const [briefing, setBriefing]     = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingTime, setBriefingTime] = useState<string | null>(null);
  const [speaking, setSpeaking]     = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/dashboard/stats');
      const json = await res.json();
      setStats(json.stats ?? []);
      setGa4Data(json.ga4 ?? []);
      setGa4Connected(json.ga4Connected ?? false);
    } finally { setLoading(false); }
  }, []);

  const fetchCycleStatus = useCallback(async () => {
    const res  = await fetch('/api/dashboard/cycle-status');
    const json = await res.json();
    setCycleStatus(json);
  }, []);

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/ideas');
      if (!res.ok) return;
      const json = await res.json() as Record<string, { content: string }>;
      const map: Record<string, string> = {};
      for (const [svc, d] of Object.entries(json)) map[svc] = d.content;
      setIdeas(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchCycleStatus();
    fetchIdeas();
  }, [fetchDashboard, fetchCycleStatus, fetchIdeas]);

  async function generatePlan() {
    setPlanLoading(true);
    try {
      const res  = await fetch('/api/dashboard/plan', { method: 'POST' });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // 새 사이클을 state에 바로 반영
      const doneCount = 0;
      const totalCount = (json.tasks as CycleTask[]).length;
      setCycleStatus({
        hasCycle: true, allDone: false, doneCount, totalCount,
        cycle: { id: json.cycleId, tasks: json.tasks, createdAt: new Date().toISOString() },
      });
      setTab('cycle');
    } catch (e) {
      alert('플랜 생성 실패: ' + (e as Error).message);
    } finally { setPlanLoading(false); }
  }

  async function toggleTask(cycleId: string, taskId: string) {
    setToggling(taskId);
    try {
      const res  = await fetch('/api/dashboard/task-toggle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, taskId }),
      });
      const json = await res.json() as { tasks: CycleTask[]; doneCount: number; allDone: boolean };
      setCycleStatus(prev => prev ? {
        ...prev,
        doneCount:  json.doneCount,
        totalCount: json.tasks.length,
        allDone:    json.allDone,
        cycle: prev.cycle ? { ...prev.cycle, tasks: json.tasks } : prev.cycle,
      } : prev);
    } finally { setToggling(null); }
  }

  async function saveIdea(service: string) {
    setIdeasSaving(service);
    try {
      await fetch('/api/dashboard/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, content: ideas[service] ?? '' }),
      });
    } finally { setIdeasSaving(null); }
  }

  function downloadIdeas() {
    const date = new Date().toLocaleDateString('ko-KR');
    let md = `# 서비스 아이디어 노트\n생성일: ${date}\n\n`;
    for (const [svc, label] of Object.entries(SERVICE_LABELS))
      md += `## ${label}\n\n${ideas[svc] || '(내용 없음)'}\n\n---\n\n`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `ideas-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function generateBriefing() {
    setBriefingLoading(true);
    try {
      const res  = await fetch('/api/dashboard/briefing');
      const json = await res.json() as { briefing?: string; error?: string; generatedAt?: string };
      setBriefing(json.briefing ?? json.error ?? '생성 실패');
      setBriefingTime(json.generatedAt ?? new Date().toISOString());
    } finally { setBriefingLoading(false); }
  }

  function startSpeech() {
    if (!briefing || typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(stripMarkdown(briefing));
    utt.lang = 'ko-KR'; utt.rate = 0.9;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }
  function stopSpeech() { window.speechSynthesis?.cancel(); setSpeaking(false); }

  const totalPosts   = stats.reduce((s,x) => s + (x.blog?.total ?? 0), 0);
  const totalRecipes = stats.find(s => s.service === 'flavorsync')?.recipe?.total ?? 0;
  const weeklyPosts  = stats.reduce((s,x) => s + (x.blog?.recentWeek ?? 0), 0);
  const totalCostUSD = ARCH_DATA.reduce((s,d) => s + d.costs.reduce((a,c) => a + c.usd, 0), 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 현황' },
    { id: 'cycle',    label: '✅ AI PM 사이클' },
    { id: 'ideas',    label: '💡 아이디어' },
    { id: 'costs',    label: '🏗️ 비용·아키텍처' },
    { id: 'briefing', label: '🌅 모닝 브리핑' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">서비스 데이터 수집 중...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">서비스 통합 대시보드</h1>
            <p className="text-xs text-gray-500 mt-0.5">4개 서비스 AI PM 통합 운영</p>
          </div>
          <div className="flex gap-3">
            {ga4Connected
              ? <span className="px-4 py-2 text-sm bg-green-700 rounded-lg">GA4 연결됨 ✓</span>
              : <a href="/api/dashboard/ga4/connect" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">GA4 연결</a>}
            <button onClick={fetchDashboard} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">새로고침</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-violet-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
              {t.id === 'cycle' && (cycleStatus?.totalCount ?? 0) > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-violet-700">
                  {cycleStatus!.doneCount}/{cycleStatus!.totalCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── 현황 탭 ── */}
        {tab === 'overview' && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{ label: '총 블로그 글', value: totalPosts, unit: '개' },
                { label: '이번 주 신규', value: weeklyPosts, unit: '개' },
                { label: '레시피',       value: totalRecipes, unit: '개' },
                { label: '운영 서비스',  value: 4, unit: '개' }].map(item => (
                <div key={item.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <p className="text-sm text-gray-400">{item.label}</p>
                  <p className="text-3xl font-bold mt-1">{item.value}<span className="text-sm text-gray-500 font-normal ml-1">{item.unit}</span></p>
                </div>
              ))}
            </div>

            {/* AI PM 사이클 요약 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">✅ AI PM 사이클</h2>
                <button onClick={generatePlan} disabled={planLoading}
                  className="px-5 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-500 rounded-lg disabled:opacity-50 transition-colors">
                  {planLoading ? '🔄 생성 중...' : cycleStatus?.hasCycle ? '🔄 새 플랜 생성' : '🚀 플랜 생성 시작'}
                </button>
              </div>
              {cycleStatus?.hasCycle && cycleStatus.cycle ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">
                      {cycleStatus.doneCount}/{cycleStatus.totalCount} 완료
                      {cycleStatus.allDone && <span className="ml-2 text-green-400 font-medium">🎉 사이클 완료!</span>}
                    </p>
                    <button onClick={() => setTab('cycle')} className="text-xs text-violet-400 hover:text-violet-300">자세히 보기 →</button>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full transition-all"
                      style={{ width: `${cycleStatus.totalCount > 0 ? (cycleStatus.doneCount / cycleStatus.totalCount) * 100 : 0}%` }} />
                  </div>
                  {/* 미완료 태스크 미리보기 */}
                  <div className="mt-4 space-y-1">
                    {cycleStatus.cycle.tasks.filter(t => !t.done).slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-gray-600" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {cycleStatus.cycle.tasks.filter(t => !t.done).length > 3 && (
                      <p className="text-xs text-gray-600 pl-4">외 {cycleStatus.cycle.tasks.filter(t => !t.done).length - 3}개...</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">플랜을 생성하면 체크리스트가 만들어집니다. 완료하면 새 사이클을 시작하세요.</p>
              )}
            </div>

            {/* 서비스별 블로그 현황 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">서비스별 블로그 현황</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.map(s => (
                  <div key={s.service} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[s.service] ?? 'bg-gray-500'}`} />
                        <span className="font-semibold">{SERVICE_LABELS[s.service] ?? s.service}</span>
                      </div>
                      <a href={`https://${s.domain}`} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-gray-300">{s.domain} ↗</a>
                    </div>
                    {s.error ? <p className="text-red-400 text-sm">{s.error}</p> : (
                      <>
                        <div className="flex gap-6 mb-4">
                          <div><p className="text-xs text-gray-500">총 글</p><p className="text-2xl font-bold">{s.blog?.total ?? 0}</p></div>
                          <div><p className="text-xs text-gray-500">이번 주</p><p className="text-2xl font-bold text-green-400">{s.blog?.recentWeek ?? 0}</p></div>
                          {s.recipe && <div><p className="text-xs text-gray-500">레시피</p><p className="text-2xl font-bold text-orange-400">{s.recipe.total}</p></div>}
                          {s.blog?.ko !== undefined && <div><p className="text-xs text-gray-500">KO/EN/JA</p><p className="text-sm font-medium text-gray-300">{s.blog.ko}/{s.blog.en}/{s.blog.ja ?? 0}</p></div>}
                        </div>
                        <div className="space-y-1">
                          {s.blog?.recent?.slice(0,3).map((post, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <p className="text-xs text-gray-400 truncate mr-3">• {getPostTitle(post)}</p>
                              <p className="text-xs text-gray-600 shrink-0">{getPostDate(post)}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* GA4 */}
            {ga4Connected && ga4Data.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">GA4 트래픽 현황 (최근 7일)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ga4Data.map(g => (
                    <div key={g.property} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[g.property] ?? 'bg-gray-500'}`} />
                          <span className="font-semibold">{SERVICE_LABELS[g.property] ?? g.property}</span>
                        </div>
                        <span className="text-xs text-gray-500">{g.domain}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div><p className="text-xs text-gray-500">세션</p><p className="text-xl font-bold">{g.sessions.toLocaleString()}</p></div>
                        <div><p className="text-xs text-gray-500">사용자</p><p className="text-xl font-bold">{g.users.toLocaleString()}</p></div>
                        <div><p className="text-xs text-gray-500">페이지뷰</p><p className="text-xl font-bold">{g.pageViews.toLocaleString()}</p></div>
                      </div>
                      {g.topPages?.slice(0,3).map((page,i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-400 py-1 border-t border-gray-700/50">
                          <span className="truncate mr-2">{page.page}</span>
                          <span className="shrink-0">{page.views.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── AI PM 사이클 탭 ── */}
        {tab === 'cycle' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">✅ AI PM 사이클 체크리스트</h2>
                <p className="text-xs text-gray-500 mt-1">항목을 클릭하면 완료/미완료 토글됩니다</p>
              </div>
              <button onClick={generatePlan} disabled={planLoading}
                className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg disabled:opacity-50 transition-colors">
                {planLoading ? '생성 중...' : '🔄 새 플랜 생성'}
              </button>
            </div>

            {!cycleStatus?.hasCycle || !cycleStatus.cycle?.tasks.length ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-5xl mb-4">📋</p>
                <p className="text-lg">아직 사이클이 없습니다.</p>
                <p className="text-sm mt-2">현황 탭에서 플랜을 생성하면 체크리스트가 만들어집니다.</p>
                <button onClick={generatePlan} disabled={planLoading}
                  className="mt-6 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {planLoading ? '생성 중...' : '🚀 지금 바로 플랜 생성'}
                </button>
              </div>
            ) : (
              <>
                {/* 진행률 */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-400">전체 진행률</p>
                    {cycleStatus.allDone
                      ? <span className="text-green-400 text-sm font-medium">🎉 모두 완료!</span>
                      : <span className="text-sm text-gray-300">{cycleStatus.doneCount} / {cycleStatus.totalCount}</span>}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-violet-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${cycleStatus.totalCount > 0 ? (cycleStatus.doneCount / cycleStatus.totalCount) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    생성: {new Date(cycleStatus.cycle.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                {/* 카테고리별 태스크 */}
                {(['action','plan','warning'] as const).map(cat => {
                  const items = cycleStatus.cycle!.tasks.filter(t => t.category === cat);
                  if (!items.length) return null;
                  const s = CATEGORY_STYLES[cat];
                  const doneInCat = items.filter(t => t.done).length;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className={`text-sm font-semibold ${s.text}`}>{s.label}</h3>
                        <span className="text-xs text-gray-600">{doneInCat}/{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map(task => (
                          <div key={task.id}
                            onClick={() => !toggling && toggleTask(cycleStatus.cycle!.id, task.id)}
                            className={`border ${s.border} ${s.bg} rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:brightness-110 transition-all ${
                              toggling === task.id ? 'opacity-60' : ''
                            }`}>
                            {/* 체크박스 */}
                            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              task.done ? 'bg-green-500 border-green-500' : 'border-gray-500'
                            }`}>
                              {task.done && <span className="text-white text-xs">✓</span>}
                            </div>
                            {/* 내용 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${SERVICE_COLORS[task.service] ?? 'bg-gray-500'}`} />
                                <span className="text-xs text-gray-400">{SERVICE_LABELS[task.service] ?? task.service}</span>
                              </div>
                              <p className={`text-sm font-medium leading-snug ${
                                task.done ? 'line-through text-gray-500' : 'text-white'
                              }`}>{task.title}</p>
                              {!task.done && task.body && (
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{task.body}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {cycleStatus.allDone && (
                  <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 text-center">
                    <p className="text-green-400 text-lg font-semibold mb-2">🎉 모든 항목을 완료했습니다!</p>
                    <p className="text-gray-400 text-sm mb-4">새로운 AI 전략 플랜으로 다음 사이클을 시작하세요.</p>
                    <button onClick={generatePlan} disabled={planLoading}
                      className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                      🚀 새 사이클 시작
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 아이디어 탭 ── */}
        {tab === 'ideas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">💡 서비스별 아이디어 노트</h2>
                <p className="text-xs text-gray-500 mt-1">각 서비스의 아이디어, 개선사항, TODO를 자유롭게 기록하세요.</p>
              </div>
              <button onClick={downloadIdeas} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">⬇ Markdown 다운로드</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SERVICE_LABELS).map(([svc, label]) => (
                <div key={svc} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[svc] ?? 'bg-gray-500'}`} />
                      <span className="font-semibold text-sm">{label}</span>
                    </div>
                    <button onClick={() => saveIdea(svc)} disabled={ideasSaving === svc}
                      className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 rounded disabled:opacity-50 transition-colors">
                      {ideasSaving === svc ? '저장 중...' : '저장'}
                    </button>
                  </div>
                  <textarea
                    value={ideas[svc] ?? ''}
                    onChange={e => setIdeas(prev => ({ ...prev, [svc]: e.target.value }))}
                    onBlur={() => saveIdea(svc)}
                    placeholder={`${label}의 아이디어, 개선사항, TODO 등...`}
                    className="w-full h-48 bg-gray-900/60 border border-gray-600/50 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 text-center">포커스를 잃으면 자동 저장됩니다</p>
          </div>
        )}

        {/* ── 비용·아키텍처 탭 ── */}
        {tab === 'costs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">🏗️ 비용 & 아키텍처 현황</h2>
              <p className="text-xs text-gray-500 mt-1">* 추정값 포함. Gemini API 비용은 실제 사용량에 따라 달라집니다.</p>
            </div>
            <div className="bg-gradient-to-r from-violet-900/30 to-blue-900/30 border border-violet-700/50 rounded-xl p-6">
              <p className="text-sm text-gray-400 mb-1">전체 월 운영 비용 (추정)</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">${totalCostUSD}</p>
                <p className="text-gray-400 mb-1">/ month</p>
                <p className="text-xl text-gray-300 mb-1">≈ ₩{(totalCostUSD * 1450).toLocaleString()}</p>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {ARCH_DATA.map(d => {
                  const total = d.costs.reduce((s,c) => s + c.usd, 0);
                  return (
                    <div key={d.service} className="text-center">
                      <div className={`w-2 h-2 rounded-full ${SERVICE_COLORS[d.service]} mx-auto mb-1`} />
                      <p className="text-xs text-gray-400">{d.name}</p>
                      <p className="text-sm font-bold">${total}<span className="text-gray-500 text-xs">/mo</span></p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ARCH_DATA.map(d => (
                <div key={d.service} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[d.service]}`} />
                      <span className="font-semibold">{d.name}</span>
                    </div>
                    <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-gray-300">{d.domain} ↗</a>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {[{k:'프레임워크',v:d.framework},{k:'DB',v:d.db},{k:'인증',v:d.auth},{k:'AI',v:d.ai},{k:'호스팅',v:d.hosting}].map(row=>(
                      <div key={row.k} className="flex text-xs">
                        <span className="text-gray-500 w-20 shrink-0">{row.k}</span>
                        <span className="text-gray-300">{row.v}</span>
                      </div>
                    ))}
                    {d.extras.length > 0 && (
                      <div className="flex text-xs">
                        <span className="text-gray-500 w-20 shrink-0">기타</span>
                        <span className="text-gray-400">{d.extras.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-700 pt-3 space-y-1">
                    {d.costs.map((c,i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-300">{c.item}</span>
                          {c.est && <span className="text-gray-600 text-[10px]">추정</span>}
                        </div>
                        <div className="text-right">
                          <span className={c.usd === 0 ? 'text-green-400' : 'text-yellow-400'}>${c.usd}<span className="text-gray-600">/mo</span></span>
                          <span className="text-gray-600 ml-2">{c.note}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold pt-1 border-t border-gray-700/50">
                      <span className="text-gray-400">소계</span>
                      <span className="text-white">${d.costs.reduce((s,c)=>s+c.usd,0)}/mo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 모닝 브리핑 탭 ── */}
        {tab === 'briefing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">🌅 AI 모닝 브리핑</h2>
                <p className="text-xs text-gray-500 mt-1">전날 트래픽 · 블로그 등록수 · 최근 커밋을 AI가 요약해 보고합니다.</p>
              </div>
              <button onClick={generateBriefing} disabled={briefingLoading}
                className="px-5 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 rounded-lg disabled:opacity-50 transition-colors">
                {briefingLoading ? '🔄 생성 중...' : '📋 브리핑 생성'}
              </button>
            </div>
            {!briefing ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🌅</p>
                <p className="text-gray-400">브리핑 생성 버튼을 눌러 오늘의 모닝 브리핑을 받으세요.</p>
                <p className="text-xs text-gray-600 mt-2">전날 GA4 트래픽 · 블로그 현황 · 최근 커밋 기반으로 생성됩니다.</p>
              </div>
            ) : (
              <div className="bg-gray-800/50 border border-amber-700/30 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">생성 시각: {briefingTime ? new Date(briefingTime).toLocaleString('ko-KR') : '-'}</p>
                  <div className="flex gap-2">
                    {speaking
                      ? <button onClick={stopSpeech} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-lg transition-colors">■ 중지</button>
                      : <button onClick={startSpeech} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-600 rounded-lg transition-colors">▶ 읽어드리기</button>
                    }
                    <button onClick={generateBriefing} disabled={briefingLoading}
                      className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 transition-colors">🔄 재생성</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {briefing.split('\n').map((line, i) =>
                    line.trim() === '' ? <br key={i} /> : <p key={i} className="text-gray-200 leading-relaxed">{line}</p>
                  )}
                </div>
                {speaking && <div className="flex items-center gap-2 text-xs text-green-400 animate-pulse"><span>🔊</span><span>읽는 중...</span></div>}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">마지막 업데이트: {new Date().toLocaleString('ko-KR')}</p>
      </div>
    </div>
  );
}
