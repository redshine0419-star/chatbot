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
interface PlanItem { service: string; title: string; body: string; }
interface Plan {
  summary: string;
  actions: PlanItem[];
  twoWeekPlan: PlanItem[];
  warnings: PlanItem[];
}
interface CycleIssue {
  service: string; repo: string; issueNumber: number; title: string;
  category: 'action' | 'plan' | 'warning'; url: string; status: 'open' | 'closed';
}
interface CycleStatus {
  hasCycle: boolean; allDone: boolean; openCount: number; closedCount: number;
  cycle?: { id: string; issues: CycleIssue[]; createdAt: string; completedAt?: string; };
}

const SERVICE_COLORS: Record<string, string> = {
  marketerops: 'bg-violet-500', flavorsync: 'bg-orange-500',
  taskgrid: 'bg-blue-500', askhistory: 'bg-emerald-500',
};
const SERVICE_LABELS: Record<string, string> = {
  marketerops: 'MarketerOps.ai', flavorsync: 'FlavorSync',
  taskgrid: 'TaskGrid', askhistory: 'AskHistory',
};
const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  action:  { label: '🎯 핵심액션', color: 'text-violet-400 border-violet-700 bg-violet-900/20' },
  plan:    { label: '📅 2주플랜',  color: 'text-blue-400 border-blue-700 bg-blue-900/20' },
  warning: { label: '⚠️ 주의신호', color: 'text-yellow-400 border-yellow-700 bg-yellow-900/20' },
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
      { item: 'Vercel',     usd: 0, est: true, note: 'Hobby/Free' },
      { item: 'Neon DB',    usd: 0, est: false, note: '무료 티어' },
      { item: 'Gemini API', usd: 1, est: true,  note: '블로그 자동생성' },
    ],
  },
  {
    service: 'taskgrid', name: 'TaskGrid', domain: 'taskgrid.my',
    framework: 'Next.js 15 App Router', db: 'Neon PostgreSQL + Google Sheets (사용자 데이터)', auth: 'Google OAuth 2.0',
    ai: 'Gemini 2.5 Flash', hosting: 'Vercel',
    extras: ['Google Sheets API v4'],
    costs: [
      { item: 'Vercel',     usd: 0, est: true, note: 'Hobby/Free' },
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
      { item: 'Vercel',     usd: 0, est: true, note: 'Hobby/Free' },
      { item: 'DB',         usd: 0, est: false, note: '무료 티어' },
      { item: 'Gemini API', usd: 1, est: true,  note: '콘텐츠 생성' },
    ],
  },
];

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '').replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1').replace(/[-*+]\s+/g, '')
    .replace(/\n\n+/g, '\n').trim();
}
function getPostDate(post: RecentPost): string {
  const raw = post.createdAt ?? post.publishedAt ?? post.date;
  if (!raw) return '';
  try { return new Date(raw).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }); }
  catch { return String(raw).slice(0, 10); }
}
function getPostTitle(post: RecentPost): string {
  return post.title ?? post.slug ?? String(post.id ?? '');
}

type Tab = 'overview' | 'cycle' | 'ideas' | 'costs' | 'briefing';

export default function DashboardPage() {
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [ga4Data, setGa4Data] = useState<GA4Data[]>([]);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  // 아이디어
  const [ideas, setIdeas] = useState<Record<string, string>>({});
  const [ideasSaving, setIdeasSaving] = useState<string | null>(null);

  // 모닝 브리핑
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingTime, setBriefingTime] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      setStats(json.stats ?? []);
      setGa4Data(json.ga4 ?? []);
      setGa4Connected(json.ga4Connected ?? false);
    } finally { setLoading(false); }
  }, []);

  const fetchCycleStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/dashboard/cycle-status');
      const json = await res.json();
      setCycleStatus(json);
    } finally { setStatusLoading(false); }
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
    setPlanLoading(true); setPlan(null); setCycleId(null);
    try {
      const res = await fetch('/api/dashboard/plan', { method: 'POST' });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setPlan(json.plan); setCycleId(json.cycleId);
    } catch (e) { alert('플랜 생성 실패: ' + (e as Error).message); }
    finally { setPlanLoading(false); }
  }

  async function executeIssues() {
    if (!plan || !cycleId) return;
    setExecuting(true); setExecuteError(null);
    try {
      const res = await fetch('/api/dashboard/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Unknown error');
      if (json.issueCount > 0) {
        const openCount = json.issues.filter((i: CycleIssue) => i.status === 'open').length;
        const closedCount = json.issues.filter((i: CycleIssue) => i.status === 'closed').length;
        setCycleStatus({ hasCycle: true, allDone: false, openCount, closedCount, cycle: json.cycle });
        setTab('cycle');
        if (json.errors?.length > 0) setExecuteError(`일부 실패: ${json.errors.join(', ')}`);
      } else {
        setExecuteError(json.errors?.join('\n') || 'GITHUB_TOKEN을 확인하세요.');
      }
    } catch (e) { setExecuteError((e as Error).message); }
    finally { setExecuting(false); }
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
    for (const [svc, label] of Object.entries(SERVICE_LABELS)) {
      md += `## ${label}\n\n${ideas[svc] || '(내용 없음)'}\n\n---\n\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ideas-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function generateBriefing() {
    setBriefingLoading(true);
    try {
      const res = await fetch('/api/dashboard/briefing');
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
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  const totalPosts   = stats.reduce((s, x) => s + (x.blog?.total ?? 0), 0);
  const totalRecipes = stats.find(s => s.service === 'flavorsync')?.recipe?.total ?? 0;
  const weeklyPosts  = stats.reduce((s, x) => s + (x.blog?.recentWeek ?? 0), 0);
  const totalCostUSD = ARCH_DATA.reduce((s, d) => s + d.costs.reduce((a, c) => a + c.usd, 0), 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 현황' },
    { id: 'cycle',    label: '🔄 AI PM 사이클' },
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
              {t.id === 'cycle' && cycleStatus?.cycle?.issues.length ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-violet-600">
                  {cycleStatus.openCount}/{cycleStatus.cycle.issues.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── 현황 탭 ── */}
        {tab === 'overview' && (
          <>
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
                          {s.blog?.recent?.slice(0, 3).map((post, i) => (
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
                      {g.topPages?.slice(0, 3).map((page, i) => (
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

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">AI 전략 플랜</h2>
                <button onClick={generatePlan} disabled={planLoading}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg disabled:opacity-50 transition-colors">
                  {planLoading ? '분석 중...' : plan ? '플랜 재생성' : '플랜 생성'}
                </button>
              </div>
              {!plan ? (
                <p className="text-gray-500 text-sm">&quot;플랜 생성&quot; 버튼을 눌러 Gemini AI 전략 분석을 시작하세요.</p>
              ) : (
                <div className="space-y-6">
                  {plan.summary && <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-gray-600 pl-4">{plan.summary}</p>}
                  {[{ key: 'actions', label: '🎯 이번 주 핵심 액션', color: 'text-violet-400', border: 'border-violet-700/50 bg-violet-900/10', items: plan.actions },
                    { key: 'twoWeek', label: '📅 2주 플랜', color: 'text-blue-400', border: 'border-blue-700/50 bg-blue-900/10', items: plan.twoWeekPlan },
                    { key: 'warnings', label: '⚠️ 주의 신호', color: 'text-yellow-400', border: 'border-yellow-700/50 bg-yellow-900/10', items: plan.warnings },
                  ].map(section => (
                    <div key={section.key}>
                      <h3 className={`text-sm font-semibold ${section.color} mb-3`}>{section.label}</h3>
                      <div className="space-y-3">
                        {section.items?.map((item, i) => (
                          <div key={i} className={`border ${section.border} rounded-lg p-4`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${SERVICE_COLORS[item.service] ?? 'bg-gray-500'}`} />
                              <span className="text-xs text-gray-400">{SERVICE_LABELS[item.service]}</span>
                            </div>
                            <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                            <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {executeError && (
                    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                      <p className="text-red-400 text-sm">⚠️ {executeError}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-700">
                    <button onClick={executeIssues} disabled={executing}
                      className="w-full py-3 text-sm font-medium bg-green-700 hover:bg-green-600 rounded-lg disabled:opacity-50 transition-colors">
                      {executing ? '🔄 GitHub Issues 생성 중...' : '🚀 GitHub Issues 자동 생성 & 사이클 시작'}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">각 서비스 repo에 이슈가 생성되고 AI PM 사이클이 시작됩니다</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── AI PM 사이클 탭 ── */}
        {tab === 'cycle' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">🔄 AI PM 사이클 진행 현황</h2>
              <button onClick={fetchCycleStatus} disabled={statusLoading}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 transition-colors">
                {statusLoading ? '확인 중...' : '상태 새로고침'}
              </button>
            </div>
            {!cycleStatus?.hasCycle || !cycleStatus.cycle?.issues.length ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-4xl mb-4">🤖</p>
                <p>아직 사이클이 없습니다.</p>
                <p className="text-sm mt-2">현황 탭에서 플랜을 생성하고 이슈를 만들어보세요.</p>
              </div>
            ) : (
              <>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-400">전체 진행률</p>
                      <p className="text-2xl font-bold mt-1">
                        {cycleStatus.closedCount ?? 0}
                        <span className="text-gray-500 font-normal text-lg"> / {cycleStatus.cycle.issues.length} 완료</span>
                      </p>
                    </div>
                    {cycleStatus.allDone
                      ? <span className="px-4 py-2 bg-green-700 rounded-lg text-sm font-medium">✅ 사이클 완료!</span>
                      : <span className="text-sm text-yellow-400">{cycleStatus.openCount}개 진행 중</span>}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${((cycleStatus.closedCount ?? 0) / cycleStatus.cycle.issues.length) * 100}%` }} />
                  </div>
                </div>
                {(['action', 'plan', 'warning'] as const).map(cat => {
                  const items = cycleStatus.cycle?.issues.filter(i => i.category === cat) ?? [];
                  if (!items.length) return null;
                  const style = CATEGORY_STYLES[cat];
                  return (
                    <div key={cat}>
                      <h3 className={`text-sm font-semibold mb-3 ${style.color.split(' ')[0]}`}>{style.label}</h3>
                      <div className="space-y-2">
                        {items.map(issue => (
                          <div key={issue.url} className={`border rounded-lg p-4 flex items-start gap-4 ${style.color}`}>
                            <div className="mt-0.5">
                              {issue.status === 'closed' ? <span className="text-green-400 text-lg">✅</span> : <span className="text-gray-400 text-lg">🔲</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SERVICE_COLORS[issue.service] ?? 'bg-gray-500'}`} />
                                <span className="text-xs text-gray-400">{SERVICE_LABELS[issue.service]}</span>
                                <span className="text-xs text-gray-600">#{issue.issueNumber}</span>
                              </div>
                              <p className={`text-sm font-medium ${issue.status === 'closed' ? 'line-through text-gray-500' : 'text-white'}`}>{issue.title}</p>
                            </div>
                            <a href={issue.url} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-gray-300 shrink-0">GitHub ↗</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {cycleStatus.allDone && (
                  <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 text-center">
                    <p className="text-green-400 text-lg font-semibold mb-2">🎉 모든 이슈가 완료됐습니다!</p>
                    <p className="text-gray-400 text-sm mb-4">새로운 AI 전략 플랜으로 다음 사이클을 시작하세요.</p>
                    <button onClick={() => { setTab('overview'); generatePlan(); }}
                      className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors">
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
                <p className="text-xs text-gray-500 mt-1">각 서비스의 아이디어, 개선사항, 메모를 자유롭게 기록하세요.</p>
              </div>
              <button onClick={downloadIdeas}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                ⬇ Markdown 다운로드
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(SERVICE_LABELS).map(([svc, label]) => (
                <div key={svc} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[svc] ?? 'bg-gray-500'}`} />
                      <span className="font-semibold text-sm">{label}</span>
                    </div>
                    <button
                      onClick={() => saveIdea(svc)}
                      disabled={ideasSaving === svc}
                      className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 rounded disabled:opacity-50 transition-colors">
                      {ideasSaving === svc ? '저장 중...' : '저장'}
                    </button>
                  </div>
                  <textarea
                    value={ideas[svc] ?? ''}
                    onChange={e => setIdeas(prev => ({ ...prev, [svc]: e.target.value }))}
                    onBlur={() => saveIdea(svc)}
                    placeholder={`${label}의 아이디어, 개선사항, TODO 등을 자유롭게 작성하세요...`}
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

            {/* 총 비용 요약 */}
            <div className="bg-gradient-to-r from-violet-900/30 to-blue-900/30 border border-violet-700/50 rounded-xl p-6">
              <p className="text-sm text-gray-400 mb-1">전체 월 운영 비용 (추정)</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">${totalCostUSD}</p>
                <p className="text-gray-400 mb-1">/ month</p>
                <p className="text-xl text-gray-300 mb-1">≈ ₩{(totalCostUSD * 1450).toLocaleString()}</p>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {ARCH_DATA.map(d => {
                  const total = d.costs.reduce((s, c) => s + c.usd, 0);
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

            {/* 서비스별 상세 */}
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

                  {/* 스택 */}
                  <div className="space-y-1.5 mb-4">
                    {[
                      { k: '프레임워크', v: d.framework },
                      { k: 'DB',        v: d.db },
                      { k: '인증',       v: d.auth },
                      { k: 'AI',        v: d.ai },
                      { k: '호스팅',    v: d.hosting },
                    ].map(row => (
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

                  {/* 비용 */}
                  <div className="border-t border-gray-700 pt-3 space-y-1">
                    {d.costs.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-300">{c.item}</span>
                          {c.est && <span className="text-gray-600 text-[10px]">추정</span>}
                        </div>
                        <div className="text-right">
                          <span className={c.usd === 0 ? 'text-green-400' : 'text-yellow-400'}>
                            ${c.usd}<span className="text-gray-600">/mo</span>
                          </span>
                          <span className="text-gray-600 ml-2">{c.note}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold pt-1 border-t border-gray-700/50">
                      <span className="text-gray-400">소계</span>
                      <span className="text-white">${d.costs.reduce((s, c) => s + c.usd, 0)}/mo</span>
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
                <p className="text-xs text-gray-500 mt-1">전날 트래픽 · 블로그 등록 · 개발 내용을 AI가 요약해 보고합니다.</p>
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
                {/* TTS 컨트롤 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">
                      생성 시각: {briefingTime ? new Date(briefingTime).toLocaleString('ko-KR') : '-'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {speaking
                      ? <button onClick={stopSpeech}
                          className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-lg transition-colors">
                          ■ 중지
                        </button>
                      : <button onClick={startSpeech}
                          className="px-4 py-2 text-sm bg-green-700 hover:bg-green-600 rounded-lg transition-colors">
                          ▶ 읽어드리기
                        </button>
                    }
                    <button onClick={generateBriefing} disabled={briefingLoading}
                      className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 transition-colors">
                      🔄 재생성
                    </button>
                  </div>
                </div>

                {/* 브리핑 본문 */}
                <div className="prose prose-invert prose-sm max-w-none">
                  {briefing.split('\n').map((line, i) => (
                    line.trim() === ''
                      ? <br key={i} />
                      : <p key={i} className="text-gray-200 leading-relaxed">{line}</p>
                  ))}
                </div>

                {speaking && (
                  <div className="flex items-center gap-2 text-xs text-green-400 animate-pulse">
                    <span>🔊</span>
                    <span>읽는 중...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">
          마지막 업데이트: {new Date().toLocaleString('ko-KR')}
        </p>
      </div>
    </div>
  );
}
