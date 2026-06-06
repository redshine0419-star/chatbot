'use client';

import { useEffect, useState } from 'react';

interface ServiceStats {
  service: string;
  domain: string;
  blog: { total: number; recentWeek: number; recent: Array<{ title: string; slug?: string; id?: string; createdAt?: string; publishedAt?: string; date?: string }> };
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
  avgEngagementTime: number;
  topPages: Array<{ page: string; views: number }>;
  channelBreakdown: Array<{ channel: string; sessions: number }>;
}

interface DashboardData {
  stats: ServiceStats[];
  ga4: GA4Data[];
  plan: string;
  ga4Connected: boolean;
  generatedAt: string;
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [ga4Status, setGa4Status] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      setData(json);
      if (json.ga4Connected) setGa4Status('connected');
    } finally {
      setLoading(false);
    }
  }

  async function connectGA4() {
    setGa4Status('connecting');
    window.location.href = '/api/dashboard/ga4/connect';
  }

  async function generatePlan() {
    setPlanLoading(true);
    try {
      const res = await fetch('/api/dashboard/plan', { method: 'POST' });
      const json = await res.json();
      setData((prev) => prev ? { ...prev, plan: json.plan } : prev);
    } finally {
      setPlanLoading(false);
    }
  }

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

  const totalPosts = data?.stats.reduce((sum, s) => sum + (s.blog?.total ?? 0), 0) ?? 0;
  const totalRecipes = data?.stats.find(s => s.service === 'flavorsync')?.recipe?.total ?? 0;
  const weeklyPosts = data?.stats.reduce((sum, s) => sum + (s.blog?.recentWeek ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">서비스 통합 대시보드</h1>
            <p className="text-xs text-gray-500 mt-0.5">4개 서비스 통합 현황</p>
          </div>
          <div className="flex gap-3">
            {ga4Status !== 'connected' && (
              <button
                onClick={connectGA4}
                disabled={ga4Status === 'connecting'}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {ga4Status === 'connecting' ? 'GA4 연결 중...' : 'GA4 연결'}
              </button>
            )}
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* 전체 요약 */}
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
                {item.value}
                <span className="text-sm text-gray-500 font-normal ml-1">{item.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* 서비스별 블로그 현황 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">서비스별 블로그 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.stats.map((s) => (
              <div key={s.service} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${SERVICE_COLORS[s.service] ?? 'bg-gray-500'}`} />
                    <span className="font-semibold">{SERVICE_LABELS[s.service] ?? s.service}</span>
                  </div>
                  <a
                    href={`https://${s.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    {s.domain} ↗
                  </a>
                </div>

                {s.error ? (
                  <p className="text-red-400 text-sm">{s.error}</p>
                ) : (
                  <>
                    <div className="flex gap-6 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">총 글</p>
                        <p className="text-2xl font-bold">{s.blog?.total ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">이번 주</p>
                        <p className="text-2xl font-bold text-green-400">{s.blog?.recentWeek ?? 0}</p>
                      </div>
                      {s.recipe && (
                        <div>
                          <p className="text-xs text-gray-500">레시피</p>
                          <p className="text-2xl font-bold text-orange-400">{s.recipe.total}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 mb-2">최근 게시물</p>
                      {s.blog?.recent?.slice(0, 3).map((post, i) => (
                        <p key={i} className="text-xs text-gray-400 truncate">
                          • {post.title}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GA4 트래픽 */}
        {ga4Status === 'connected' && data?.ga4 && data.ga4.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">GA4 트래픽 현황 (최근 7일)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.ga4.map((g) => (
                <div key={g.property} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold">{SERVICE_LABELS[g.property] ?? g.property}</span>
                    <span className="text-xs text-gray-500">{g.domain}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">세션</p>
                      <p className="text-xl font-bold">{g.sessions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">사용자</p>
                      <p className="text-xl font-bold">{g.users.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">페이지뷰</p>
                      <p className="text-xl font-bold">{g.pageViews.toLocaleString()}</p>
                    </div>
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

        {/* AI 전략 플랜 */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">AI 전략 플랜</h2>
            <button
              onClick={generatePlan}
              disabled={planLoading}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {planLoading ? '분석 중...' : '플랜 생성'}
            </button>
          </div>
          {data?.plan ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{data.plan}</pre>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">"플랜 생성" 버튼을 눌러 Gemini AI 전략 분석을 시작하세요.</p>
          )}
        </div>

        <p className="text-xs text-gray-600 text-center">
          마지막 업데이트: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('ko-KR') : '-'}
        </p>
      </div>
    </div>
  );
}
