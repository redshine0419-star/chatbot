'use client';

import { useEffect, useState, useCallback } from 'react';

interface RecentPost {
  title?: string;
  slug?: string;
  id?: string | number;
  createdAt?: string;
  publishedAt?: string;
  date?: string;
}

interface ServiceStats {
  service: string;
  domain: string;
  blog: { total: number; recentWeek: number; recent: RecentPost[]; ko?: number; en?: number; ja?: number };
  recipe?: { total: number };
  updatedAt: string;
  error?: string;
}

interface GA4Data {
  property: string;
  domain: string;
  sessions: number;
  users: number;
  pageViews: number;
  topPages: Array<{ page: string; views: number }>;
}

interface PlanItem {
  service: string;
  title: string;
  body: string;
}

interface Plan {
  summary: string;
  actions: PlanItem[];
  twoWeekPlan: PlanItem[];
  warnings: PlanItem[];
}

interface CycleIssue {
  service: string;
  repo: string;
  issueNumber: number;
  title: string;
  category: 'action' | 'plan' | 'warning';
  url: string;
  status: 'open' | 'closed';
}

interface CycleStatus {
  hasCycle: boolean;
  allDone: boolean;
  openCount: number;
  closedCount: number;
  cycle?: {
    id: string;
    issues: CycleIssue[];
    createdAt: string;
    completedAt?: string;
  };
}

const SERVICE_COLORS: Record<string, string> = {
  marketerops: 'bg-violet-500',
  flavorsync: 'bg-orange-500',
  taskgrid: 'bg-blue-500',
  askhistory: 'bg-emerald-500',
};

const SERVICE_LABELS: Record<string, string> = {
  marketerops: 'MarketerOps',
  flavorsync: 'FlavorSync',
  taskgrid: 'TaskGrid',
  askhistory: 'AskHistory',
};

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  action: { label: '🎯 핵심액션', color: 'text-violet-400 border-violet-700 bg-violet-900/20' },
  plan: { label: '📅 2주플랜', color: 'text-blue-400 border-blue-700 bg-blue-900/20' },
  warning: { label: '⚠️ 주의신호', color: 'text-yellow-400 border-yellow-700 bg-yellow-900/20' },
};

function getPostDate(post: RecentPost): string {
  const raw = post.createdAt ?? post.publishedAt ?? post.date;
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return String(raw).slice(0, 10);
  }
}

function getPostTitle(post: RecentPost): string {
  return post.title ?? post.slug ?? String(post.id ?? '');
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [ga4Data, setGa4Data] = useState<GA4Data[]>([]);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'cycle'>('overview');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      setStats(json.stats ?? []);
      setGa4Data(json.ga4 ?? []);
      setGa4Connected(json.ga4Connected ?? false);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCycleStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/dashboard/cycle-status');
      const json = await res.json();
      setCycleStatus(json);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchCycleStatus();
  }, [fetchDashboard, fetchCycleStatus]);

  // 사이클 완료 시 자동 새 플랜 알림
  useEffect(() => {
    if (cycleStatus?.allDone && cycleStatus.cycle?.completedAt) {
      // 모두 완료 — 새 플랜 생성 유도
    }
  }, [cycleStatus]);

  async function generatePlan() {
    setPlanLoading(true);
    try {
      const res = await fetch('/api/dashboard/plan', { method: 'POST' });
      const json = await res.json();
      setPlan(json.plan);
      setCycleId(json.cycleId);
    } finally {
      setPlanLoading(false);
    }
  }

  async function executeIssues() {
    if (!plan || !cycleId) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/dashboard/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, plan }),
      });
      const json = await res.json();
      if (json.ok) {
        setTab('cycle');
        await fetchCycleStatus();
      }
    } finally {
      setExecuting(false);
    }
  }

  const totalPosts = stats.reduce((sum, s) => sum + (s.blog?.total ?? 0), 0);
  const totalRecipes = stats.find((s) => s.service === 'flavorsync')?.recipe?.total ?? 0;
  const weeklyPosts = stats.reduce((sum, s) => sum + (s.blog?.recentWeek ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">서비스 데이터 수집 중...</p>
        </div>
      </div>
    );
  }

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
            {ga4Connected ? (
              <span className="px-4 py-2 text-sm bg-green-700 rounded-lg">GA4 연결됨 ✓</span>
            ) : (
              <a href="/api/dashboard/ga4/connect"
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                GA4 연결
              </a>
            )}
            <button onClick={fetchDashboard}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              새로고침
            </button>
          </div>
        </div>
        {/* 탭 */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
          {(['overview', 'cycle'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-violet-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}>
              {t === 'overview' ? '📊 현황' : '🔄 AI PM 사이클'}
              {t === 'cycle' && cycleStatus?.cycle?.issues.length ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-violet-600">
                  {cycleStatus.openCount}/{cycleStatus.cycle.issues.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {tab === 'overview' && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '총 블로그 글', value: totalPosts, unit: '개' },
                { label: '이번 주 신규', value: weeklyPosts, unit: '개' },
                { label: '레시피', value: totalRecipes, unit: '개' },
                { label: '운영 서비스', value: 4, unit: '개' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <p className="text-sm text-gray-400">{item.label}</p>
                  <p className="text-3xl font-bold mt-1">
                    {item.value}<span className="text-sm text-gray-500 font-normal ml-1">{item.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* 서비스별 블로그 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">서비스별 블로그 현황</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div key={s.service} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[s.service] ?? 'bg-gray-500'}`} />
                        <span className="font-semibold">{SERVICE_LABELS[s.service] ?? s.service}</span>
                      </div>
                      <a href={`https://${s.domain}`} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-300">{s.domain} ↗</a>
                    </div>
                    {s.error ? <p className="text-red-400 text-sm">{s.error}</p> : (
                      <>
                        <div className="flex gap-6 mb-4">
                          <div><p className="text-xs text-gray-500">총 글</p><p className="text-2xl font-bold">{s.blog?.total ?? 0}</p></div>
                          <div><p className="text-xs text-gray-500">이번 주</p><p className="text-2xl font-bold text-green-400">{s.blog?.recentWeek ?? 0}</p></div>
                          {s.recipe && <div><p className="text-xs text-gray-500">레시피</p><p className="text-2xl font-bold text-orange-400">{s.recipe.total}</p></div>}
                          {s.blog?.ko !== undefined && (
                            <div><p className="text-xs text-gray-500">KO/EN/JA</p><p className="text-sm font-medium text-gray-300">{s.blog.ko}/{s.blog.en}/{s.blog.ja ?? 0}</p></div>
                          )}
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

            {/* GA4 */}
            {ga4Connected && ga4Data.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">GA4 트래픽 현황 (최근 7일)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ga4Data.map((g) => (
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

            {/* AI 플랜 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">AI 전략 플랜</h2>
                <button onClick={generatePlan} disabled={planLoading}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg disabled:opacity-50 transition-colors">
                  {planLoading ? '분석 중...' : plan ? '플랜 재생성' : '플랜 생성'}
                </button>
              </div>

              {!plan ? (
                <p className="text-gray-500 text-sm">"플랜 생성" 버튼을 눌러 Gemini AI 전략 분석을 시작하세요.</p>
              ) : (
                <div className="space-y-6">
                  {plan.summary && (
                    <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-gray-600 pl-4">{plan.summary}</p>
                  )}

                  {/* 액션 3가지 */}
                  <div>
                    <h3 className="text-sm font-semibold text-violet-400 mb-3">🎯 이번 주 핵심 액션</h3>
                    <div className="space-y-3">
                      {plan.actions?.map((item, i) => (
                        <div key={i} className="border border-violet-700/50 bg-violet-900/10 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${SERVICE_COLORS[item.service] ?? 'bg-gray-500'}`} />
                            <span className="text-xs text-gray-400">{SERVICE_LABELS[item.service]}</span>
                          </div>
                          <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2주 플랜 */}
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400 mb-3">📅 2주 플랜</h3>
                    <div className="space-y-3">
                      {plan.twoWeekPlan?.map((item, i) => (
                        <div key={i} className="border border-blue-700/50 bg-blue-900/10 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${SERVICE_COLORS[item.service] ?? 'bg-gray-500'}`} />
                            <span className="text-xs text-gray-400">{SERVICE_LABELS[item.service]}</span>
                          </div>
                          <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 주의 신호 */}
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-400 mb-3">⚠️ 주의 신호</h3>
                    <div className="space-y-3">
                      {plan.warnings?.map((item, i) => (
                        <div key={i} className="border border-yellow-700/50 bg-yellow-900/10 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${SERVICE_COLORS[item.service] ?? 'bg-gray-500'}`} />
                            <span className="text-xs text-gray-400">{SERVICE_LABELS[item.service]}</span>
                          </div>
                          <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 이슈 생성 버튼 */}
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

        {tab === 'cycle' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">🔄 AI PM 사이클 진행 현황</h2>
              <button onClick={fetchCycleStatus} disabled={statusLoading}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 transition-colors">
                {statusLoading ? '확인 중...' : '상태 새로고침'}
              </button>
            </div>

            {!cycleStatus?.hasCycle ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-4xl mb-4">🤖</p>
                <p>아직 사이클이 없습니다.</p>
                <p className="text-sm mt-2">현황 탭에서 플랜을 생성하고 이슈를 만들어보세요.</p>
              </div>
            ) : (
              <>
                {/* 진행률 */}
                {cycleStatus.cycle && cycleStatus.cycle.issues.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-400">전체 진행률</p>
                        <p className="text-2xl font-bold mt-1">
                          {cycleStatus.closedCount ?? 0}
                          <span className="text-gray-500 font-normal text-lg"> / {cycleStatus.cycle.issues.length} 완료</span>
                        </p>
                      </div>
                      {cycleStatus.allDone ? (
                        <div className="text-right">
                          <span className="px-4 py-2 bg-green-700 rounded-lg text-sm font-medium">✅ 사이클 완료!</span>
                          <p className="text-xs text-gray-500 mt-2">새 플랜을 생성하세요</p>
                        </div>
                      ) : (
                        <span className="text-sm text-yellow-400">{cycleStatus.openCount}개 진행 중</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${((cycleStatus.closedCount ?? 0) / cycleStatus.cycle.issues.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 카테고리별 이슈 목록 */}
                {(['action', 'plan', 'warning'] as const).map((cat) => {
                  const items = cycleStatus.cycle?.issues.filter((i) => i.category === cat) ?? [];
                  if (items.length === 0) return null;
                  const style = CATEGORY_STYLES[cat];
                  return (
                    <div key={cat}>
                      <h3 className={`text-sm font-semibold mb-3 ${style.color.split(' ')[0]}`}>{style.label}</h3>
                      <div className="space-y-2">
                        {items.map((issue) => (
                          <div key={issue.url}
                            className={`border rounded-lg p-4 flex items-start gap-4 ${style.color}`}>
                            <div className="mt-0.5">
                              {issue.status === 'closed'
                                ? <span className="text-green-400 text-lg">✅</span>
                                : <span className="text-gray-400 text-lg">🔲</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SERVICE_COLORS[issue.service] ?? 'bg-gray-500'}`} />
                                <span className="text-xs text-gray-400">{SERVICE_LABELS[issue.service]}</span>
                                <span className="text-xs text-gray-600">#{issue.issueNumber}</span>
                              </div>
                              <p className={`text-sm font-medium ${issue.status === 'closed' ? 'line-through text-gray-500' : 'text-white'}`}>
                                {issue.title}
                              </p>
                            </div>
                            <a href={issue.url} target="_blank" rel="noreferrer"
                              className="text-xs text-gray-500 hover:text-gray-300 shrink-0">
                              GitHub ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 사이클 완료 시 새 플랜 유도 */}
                {cycleStatus.allDone && (
                  <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 text-center">
                    <p className="text-green-400 text-lg font-semibold mb-2">🎉 모든 이슈가 완료됐습니다!</p>
                    <p className="text-gray-400 text-sm mb-4">새로운 AI 전략 플랜으로 다음 사이클을 시작하세요.</p>
                    <button
                      onClick={() => { setTab('overview'); generatePlan(); }}
                      className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors">
                      🚀 새 사이클 시작
                    </button>
                  </div>
                )}
              </>
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
