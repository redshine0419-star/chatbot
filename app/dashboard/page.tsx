'use client'
import { useState, useEffect, useRef } from 'react'

const SERVICES = [
  { id: 'marketerops', name: 'MarketerOps.ai', url: 'https://growweb.me', color: 'bg-blue-500' },
  { id: 'flavorsync', name: 'FlavorSync', url: 'https://flavorsync.me', color: 'bg-orange-500' },
  { id: 'taskgrid', name: 'TaskGrid', url: 'https://taskgrid.my', color: 'bg-green-500' },
  { id: 'askhistory', name: 'AskHistory', url: 'https://askhistory.me', color: 'bg-purple-500' },
]

const SERVICE_OPTIONS = [
  { id: 'general', name: '공통' },
  ...SERVICES,
]

const COST_PRESETS = [
  { label: 'Gemini Pro', item: 'Gemini Pro 사용료', service: 'general', currency: 'USD' },
  { label: 'Claude Code', item: 'Claude Code 사용료', service: 'general', currency: 'USD' },
  { label: 'Vercel Pro', item: 'Vercel Pro', service: 'marketerops', currency: 'USD' },
  { label: 'Neon DB', item: 'Neon DB', service: 'general', currency: 'USD' },
  { label: 'Google Ads', item: 'Google Ads', service: 'general', currency: 'USD' },
  { label: 'AdSense 수입', item: 'AdSense 광고 수입', service: 'general', currency: 'KRW' },
]

const CATEGORY_STYLES = {
  action: { label: '핵심 액션', bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', stepBg: 'bg-blue-50' },
  plan: { label: '2주 플랜', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', stepBg: 'bg-green-50' },
  warning: { label: '주의 신호', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', stepBg: 'bg-red-50' },
}

const ARCH_DATA = [
  { id: 'marketerops', name: 'MarketerOps.ai', stack: 'Next.js 16 · Prisma · Neon · Gemini 2.5 Flash · Claude fallback · Vercel', cost: '$20/mo (Vercel Pro) + ~$1 AI', notes: 'GA4·GSC OAuth 연동, PageSpeed 진단, 콘텐츠 허브' },
  { id: 'flavorsync', name: 'FlavorSync', stack: 'Next.js 15 · Neon · next-auth v4 · Gemini 2.5 Flash · Vercel', cost: '$0 (Vercel Hobby) + ~$0.5 AI', notes: '레시피 위키, 냉장고 관리, YouTube OCR 분석' },
  { id: 'taskgrid', name: 'TaskGrid', stack: 'Next.js 15 · Neon · Google Sheets API · Gemini 2.5 Flash · Vercel', cost: '$0 (Vercel Hobby) + ~$0.3 AI', notes: 'Google Sheets를 DB로 사용하는 칸반 보드' },
  { id: 'askhistory', name: 'AskHistory', stack: 'Next.js 14 · Drizzle · Neon · Gemini 2.5 Flash · Vercel', cost: '$0 (Vercel Hobby) + ~$0.2 AI', notes: 'AI 세계사 학습, Q&A 챗봇' },
]

const AUTOMATION_PHASES = [
  {
    phase: '1단계 — 롱테일 SEO 콘텐츠 자동화',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    items: [
      { label: '키워드 클러스터 테이블 구축', detail: 'blog_keywords 테이블에 cluster 컬럼 추가, 서비스별 타깃 키워드 정의', done: true },
      { label: '크론 클러스터 균형 키워드 선택', detail: 'pickClusterBalancedKeyword() 구현 — 최소 커버리지 클러스터 우선 선택', done: true },
      { label: '내부링크 자동 삽입', detail: 'getRecentPostsForLinking() — 발행 시 관련 포스트 2~3개 자동 링크', done: true },
      { label: '서비스 CTA 자동 삽입', detail: '각 서비스 CTA 블록 (UTM 포함) 포스트 하단 자동 추가', done: true },
      { label: 'Slack 발행 알림', detail: '발행 완료 시 Slack Webhook으로 제목·시대·URL 전송', done: true },
    ],
  },
  {
    phase: '2단계 — SNS & GSC 최적화 자동화',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    items: [
      { label: 'X(Twitter) 자동 트윗 연동', detail: 'OAuth 1.0a HMAC-SHA1 서명, 블로그 발행 후 자동 트윗 — 4개 서비스 모두', done: true },
      { label: 'UTM 파라미터 자동 삽입', detail: 'CTA URL에 utm_source=blog&utm_medium=cta&utm_campaign=organic 적용', done: true },
      { label: 'AdSense 수익 최적화 크론', detail: 'GA4 Data API 연동 — 체류시간 상위 20% 페이지 vs 이탈률 80%+ 페이지 분석', done: true },
      { label: 'A/B 테스트 자동화', detail: 'blog_ab_tests 테이블 — 7일 후 CTR 비교, 낮은 버전 자동 교체', done: true },
    ],
  },
  {
    phase: '3단계 — 리텐션 & 개인화 자동화',
    color: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    items: [
      { label: '개인화 추천 이메일 자동화 (FlavorSync)', detail: 'user_favorites 기반 — 즐겨찾기 없는 인기 레시피 2개 Resend 자동 발송 (매주 수)', done: true },
      { label: '취약 시대 복습 알림 (AskHistory)', detail: '최근 7일 퀴즈 로그 분석 → 최소 커버리지 시대 관련 포스트 2개 이메일 발송', done: true },
      { label: '월간 마케팅 리뷰 자동화', detail: '매월 1일 크론 — 포스트 수·구독자 증가 집계, Gemini 3줄 요약 → Slack', done: true },
    ],
  },
  {
    phase: '4단계 — 측정 & 통합 대시보드',
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    items: [
      { label: '다서비스 통합 마케팅 현황 패널', detail: 'MarketerOps WorkOpsTab에 MarketingStatsSection 추가 — 4개 서비스 블로그·구독자 수 실시간 표시', done: true },
      { label: '마케팅 자동화 현황 대시보드 (이 페이지)', detail: 'https://chatbot-mu-lac-59.vercel.app/dashboard 에 완료된 자동화 항목 전체 표시', done: true },
    ],
  },
]

const CRON_SCHEDULE = [
  { service: 'FlavorSync', path: '/api/generate-blog-post', schedule: '매일 09:00 UTC', desc: '블로그 자동 발행 + 트윗' },
  { service: 'TaskGrid', path: '/api/cron/blog', schedule: '매일 00:00 UTC', desc: '블로그 자동 발행 (KO+EN) + 트윗' },
  { service: 'AskHistory', path: '/api/cron/generate', schedule: '매일 02:00 UTC', desc: '포스트 5개 자동 발행 + 트윗' },
  { service: 'MarketerOps', path: '/api/blog/cron', schedule: '매일 00:00 UTC', desc: '예약 블로그 발행' },
  { service: '전체', path: '/api/cron/adsense-report', schedule: '매월 1일 03:00 UTC', desc: 'GA4 기반 AdSense 최적화 리포트' },
  { service: 'FlavorSync', path: '/api/cron/ab-test-resolve', schedule: '매주 월 04:00 UTC', desc: 'A/B 테스트 자동 해결' },
  { service: 'FlavorSync', path: '/api/cron/monthly-review', schedule: '매월 1일 05:00 UTC', desc: '월간 마케팅 리뷰' },
  { service: 'FlavorSync', path: '/api/cron/personalized-recs', schedule: '매주 수 10:00 UTC', desc: '개인화 레시피 추천 이메일' },
  { service: 'AskHistory', path: '/api/cron/weak-era-alert', schedule: '매주 화 11:00 UTC', desc: '취약 시대 복습 알림 이메일' },
]

const ENV_VARS: { service: string; color: string; vars: { name: string; desc: string; required: boolean }[] }[] = [
  {
    service: '공통 (4개 서비스 모두)',
    color: 'bg-gray-50 border-gray-200',
    vars: [
      { name: 'TWITTER_API_KEY', desc: 'X(Twitter) OAuth 1.0a — Developer Portal에서 발급', required: true },
      { name: 'TWITTER_API_SECRET', desc: 'X API Secret Key', required: true },
      { name: 'TWITTER_ACCESS_TOKEN', desc: 'X Access Token (계정 연동)', required: true },
      { name: 'TWITTER_ACCESS_TOKEN_SECRET', desc: 'X Access Token Secret', required: true },
      { name: 'SLACK_WEBHOOK_URL', desc: '블로그 발행·월간리뷰·AdSense 리포트 알림', required: false },
      { name: 'GSC_REFRESH_TOKEN', desc: 'Google OAuth Refresh Token — GA4 Data API 호출용 (AdSense 크론)', required: false },
      { name: 'GA4_PROPERTY_ID', desc: 'GA4 Property ID (예: 123456789)', required: false },
    ],
  },
  {
    service: 'FlavorSync & AskHistory',
    color: 'bg-orange-50 border-orange-200',
    vars: [
      { name: 'RESEND_API_KEY', desc: 'Resend 이메일 API — 개인화 추천·취약시대 알림 발송', required: true },
    ],
  },
  {
    service: '전체 서비스 (선택)',
    color: 'bg-blue-50 border-blue-200',
    vars: [
      { name: 'ADSENSE_PUBLISHER_ID', desc: 'AdSense Publisher ID (예: pub-xxxxxxxxxx) — AdSense API 연동 시', required: false },
      { name: 'ADSENSE_ACCESS_TOKEN', desc: 'AdSense API Access Token — 수익 자동 리포트', required: false },
    ],
  },
  {
    service: 'MarketerOps (saasclaude)',
    color: 'bg-purple-50 border-purple-200',
    vars: [
      { name: 'CRON_SECRET', desc: '크론 인증 키 — 이미 설정됨', required: true },
    ],
  },
]

const TABS = [
  { key: 'status', label: '현황' },
  { key: 'automation', label: '마케팅 자동화' },
  { key: 'cycle', label: 'AI PM' },
  { key: 'ideas', label: '아이디어' },
  { key: 'arch', label: '비용·아키텍처' },
  { key: 'briefing', label: '모닝 브리핑' },
] as const

type TabKey = typeof TABS[number]['key']

function getPostDate(p: any): string {
  const raw = p.createdAt || p.publishedAt || p.date || ''
  if (!raw) return '-'
  try {
    return new Date(raw).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '/').replace('.', '')
  } catch {
    return String(raw).slice(0, 10)
  }
}

export default function DashboardPage() {
  const [tab, setTab] = useState<TabKey>('status')
  const [statsData, setStatsData] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [cycle, setCycle] = useState<any>(null)
  const [cycleLoading, setCycleLoading] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [ideas, setIdeas] = useState<Record<string, string>>({})
  const [editingIdea, setEditingIdea] = useState<string | null>(null)
  const [ideaDraft, setIdeaDraft] = useState('')
  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [cronCheck, setCronCheck] = useState<any>(null)
  const [cronCheckLoading, setCronCheckLoading] = useState(false)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const [costMonth, setCostMonth] = useState('')
  const [costs, setCosts] = useState<any[]>([])
  const [costsLoading, setCostsLoading] = useState(false)
  const [costForm, setCostForm] = useState({ service: 'general', item: '', amount: '', currency: 'USD', note: '' })
  const [costAdding, setCostAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    setCostMonth(new Date().toISOString().slice(0, 7))
    fetch('/api/dashboard/stats')
      .then(r => r.json()).then(d => setStatsData(d)).catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'cycle' && !cycle) loadCycle()
    if (tab === 'ideas') loadIdeas()
    if (tab === 'arch' && costMonth) loadCosts(costMonth)
  }, [tab])

  useEffect(() => { if (tab === 'arch' && costMonth) loadCosts(costMonth) }, [costMonth])

  async function loadCycle() {
    setCycleLoading(true)
    try { setCycle(await (await fetch('/api/dashboard/cycle-status')).json()) }
    finally { setCycleLoading(false) }
  }

  async function loadIdeas() {
    const data = await (await fetch('/api/dashboard/ideas')).json()
    setIdeas(Object.fromEntries(Object.entries(data).map(([k, v]: any) => [k, v.content || ''])))
  }

  async function loadCosts(month: string) {
    setCostsLoading(true)
    try { setCosts(await (await fetch(`/api/dashboard/costs?month=${month}`)).json()) }
    catch { setCosts([]) }
    finally { setCostsLoading(false) }
  }

  async function addCost() {
    if (!costForm.item || !costForm.amount) return
    setCostAdding(true)
    try {
      const res = await fetch('/api/dashboard/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...costForm, month: costMonth, amount: Number(costForm.amount) }),
      })
      const newRow = await res.json()
      setCosts(prev => [...prev, newRow])
      setCostForm({ service: 'general', item: '', amount: '', currency: 'USD', note: '' })
      setShowAddForm(false)
    } finally { setCostAdding(false) }
  }

  async function deleteCost(id: number) {
    await fetch(`/api/dashboard/costs?id=${id}`, { method: 'DELETE' })
    setCosts(prev => prev.filter(c => c.id !== id))
  }

  async function generatePlan() {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/dashboard/plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert('플랜 생성 실패: ' + (data.error || res.status)); return }
      await loadCycle()
    } finally { setPlanLoading(false) }
  }

  async function toggleTask(taskId: string) {
    if (!cycle?.cycle?.id) return
    const res = await fetch('/api/dashboard/task-toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId: cycle.cycle.id, taskId }),
    })
    const data = await res.json()
    if (data.ok) setCycle((prev: any) => ({ ...prev, cycle: { ...prev.cycle, tasks: data.tasks }, doneCount: data.doneCount, allDone: data.allDone }))
  }

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function saveIdea(serviceId: string) {
    await fetch('/api/dashboard/ideas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: serviceId, content: ideaDraft }),
    })
    setIdeas(prev => ({ ...prev, [serviceId]: ideaDraft }))
    setEditingIdea(null)
  }

  function downloadIdea(serviceId: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ideas[serviceId] || ''], { type: 'text/plain' }))
    a.download = `${serviceId}-ideas.txt`; a.click()
  }

  async function runCronCheck() {
    setCronCheckLoading(true)
    try { setCronCheck(await (await fetch('/api/cron-check')).json()) }
    finally { setCronCheckLoading(false) }
  }

  async function loadBriefing() {
    setBriefingLoading(true)
    try { setBriefing((await (await fetch('/api/dashboard/briefing')).json()).briefing || '') }
    finally { setBriefingLoading(false) }
  }

  function speak() {
    if (!briefing) return
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const u = new SpeechSynthesisUtterance(briefing)
    u.lang = 'ko-KR'; u.rate = 1.0; u.onend = () => setSpeaking(false)
    synthRef.current = u; window.speechSynthesis.speak(u); setSpeaking(true)
  }

  const statsMap: Record<string, any> = {}
  const ga4Map: Record<string, any> = {}
  if (statsData) {
    for (const s of statsData.stats || []) statsMap[s.service || s.key] = s
    for (const g of statsData.ga4 || []) ga4Map[g.property] = g
  }

  const tasks = cycle?.cycle?.tasks || []
  const doneCount = cycle?.doneCount ?? 0
  const totalCount = cycle?.totalCount ?? tasks.length
  const usdTotal = costs.filter(c => c.currency === 'USD').reduce((s, c) => s + Number(c.amount), 0)
  const krwTotal = costs.filter(c => c.currency === 'KRW').reduce((s, c) => s + Number(c.amount), 0)
  const totalKRW = Math.round(usdTotal * 1450) + krwTotal

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">서비스 통합 대시보드</h1>

        <div className="overflow-x-auto mb-6 border-b border-gray-200">
          <div className="flex gap-1 min-w-max">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {tab === 'status' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map(s => {
              const d = statsMap[s.id]; const g = ga4Map[s.id]
              const recentPosts: any[] = (d?.blog?.recent || []).slice(0, 3)
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-3 h-3 rounded-full ${s.color}`} />
                    <h2 className="font-semibold text-gray-900">{s.name}</h2>
                    <a href={s.url} target="_blank" className="ml-auto text-xs text-gray-400 hover:underline">{s.url}</a>
                  </div>
                  {statsLoading ? <p className="text-sm text-gray-400">로딩 중...</p> : (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs mb-1">전체 블로그</div><div className="font-bold text-lg">{d?.blog?.total ?? d?.totalPosts ?? '-'}</div></div>
                        <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs mb-1">이번 주 신규</div><div className="font-bold text-lg">{d?.blog?.recentWeek ?? d?.weeklyPosts ?? '-'}</div></div>
                        {typeof d?.emailSubscribers === 'number' && (
                          <div className="bg-indigo-50 rounded-lg p-3"><div className="text-indigo-500 text-xs mb-1">📧 이메일 구독</div><div className="font-bold text-lg text-indigo-700">{d.emailSubscribers.toLocaleString()}</div></div>
                        )}
                        {g && (<>
                          <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs mb-1">GA4 7일 사용자</div><div className="font-bold text-lg">{g.users?.toLocaleString()}</div></div>
                          <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs mb-1">GA4 7일 세션</div><div className="font-bold text-lg">{g.sessions?.toLocaleString()}</div></div>
                        </>)}
                        {d?.error && <div className="col-span-2 text-xs text-red-400">{d.error}</div>}
                      </div>
                      {recentPosts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">최근 포스트</p>
                          <ul className="space-y-1.5">
                            {recentPosts.map((p, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap mt-0.5 min-w-[36px]">{getPostDate(p)}</span>
                                <span className="text-xs text-gray-700 leading-snug line-clamp-2">{p.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'automation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🚀</span>
                <div>
                  <h2 className="font-bold text-gray-900">마케팅 자동화 로드맵 진행 현황</h2>
                  <p className="text-xs text-gray-500 mt-0.5">4개 서비스 (MarketerOps · FlavorSync · TaskGrid · AskHistory) 통합</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-green-600">{AUTOMATION_PHASES.flatMap(p => p.items).filter(i => i.done).length} / {AUTOMATION_PHASES.flatMap(p => p.items).length}</div>
                  <div className="text-xs text-gray-400">항목 완료</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.round(AUTOMATION_PHASES.flatMap(p => p.items).filter(i => i.done).length / AUTOMATION_PHASES.flatMap(p => p.items).length * 100)}%` }} />
              </div>
            </div>

            {AUTOMATION_PHASES.map((phase, pi) => (
              <div key={pi} className={`border rounded-xl p-5 ${phase.color}`}>
                <h3 className="font-semibold text-gray-800 mb-3">{phase.phase}</h3>
                <div className="space-y-2">
                  {phase.items.map((item, ii) => (
                    <div key={ii} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-white/60">
                      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {item.done ? '✓' : '○'}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${item.done ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                      </div>
                      {item.done && (
                        <span className={`ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${phase.badge}`}>완료</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">⏰ 크론 스케줄 현황</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs text-gray-500 font-medium py-2 pr-3">서비스</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 pr-3">엔드포인트</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 pr-3">스케줄</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2">설명</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {CRON_SCHEDULE.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2 pr-3"><span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{c.service}</span></td>
                        <td className="py-2 pr-3 font-mono text-xs text-blue-600">{c.path}</td>
                        <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">{c.schedule}</td>
                        <td className="py-2 text-xs text-gray-500">{c.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">🩺 서비스 헬스체크</h3>
                  {cronCheck && <p className="text-xs text-gray-400 mt-0.5">마지막 확인: {new Date(cronCheck.checkedAt).toLocaleString('ko-KR')}</p>}
                </div>
                <button onClick={runCronCheck} disabled={cronCheckLoading}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {cronCheckLoading ? '점검 중...' : '🔍 지금 점검'}
                </button>
              </div>
              {!cronCheck && !cronCheckLoading && (
                <p className="text-sm text-gray-400 text-center py-6">버튼을 누르면 4개 서비스 응답 상태를 실시간으로 확인합니다.</p>
              )}
              {cronCheckLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                  <span className="animate-spin">⏳</span> 4개 서비스 응답 확인 중...
                </div>
              )}
              {cronCheck && !cronCheckLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cronCheck.results?.map((r: any) => (
                    <div key={r.key} className={`rounded-lg border p-4 ${r.status === 'up' ? 'bg-green-50 border-green-200' : r.status === 'degraded' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'up' ? 'bg-green-500' : r.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className="font-medium text-sm text-gray-900">{r.name}</span>
                        <span className={`ml-auto text-xs font-semibold ${r.status === 'up' ? 'text-green-700' : r.status === 'degraded' ? 'text-yellow-700' : 'text-red-700'}`}>
                          {r.status === 'up' ? '정상' : r.status === 'degraded' ? '일부 오류' : '응답 없음'}
                        </span>
                        <span className="text-xs text-gray-400">{r.latency}ms</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex gap-4">
                          <span>📝 블로그 <strong>{r.blogTotal ?? '-'}</strong>개</span>
                          {r.emailSubscribers !== null && <span>📧 구독자 <strong>{r.emailSubscribers}</strong>명</span>}
                        </div>
                        {r.latestPostDate && (
                          <div className="text-gray-400">최근 발행: {new Date(r.latestPostDate).toLocaleDateString('ko-KR')}</div>
                        )}
                        {r.error && <div className="text-red-500 text-xs mt-1 truncate">{r.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">🔑 Vercel 신규 환경변수 설정 가이드</h3>
              {ENV_VARS.map((group, gi) => (
                <div key={gi} className={`border rounded-xl p-5 ${group.color}`}>
                  <h4 className="font-medium text-gray-800 mb-3 text-sm">{group.service}</h4>
                  <div className="space-y-2">
                    {group.vars.map((v, vi) => (
                      <div key={vi} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-white/70">
                        <span className={`mt-0.5 flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${v.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {v.required ? '필수' : '선택'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-gray-900">{v.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>📌 설정 위치:</strong> Vercel 대시보드 → 각 프로젝트 → Settings → Environment Variables<br />
                <span className="text-xs mt-1 block text-amber-600">Twitter API는 <a href="https://developer.twitter.com" target="_blank" className="underline">developer.twitter.com</a> → Free Basic Plan에서 발급. Resend는 <a href="https://resend.com" target="_blank" className="underline">resend.com</a> 무료 3,000건/월.</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'cycle' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                {cycle?.hasCycle && `진행 중: ${doneCount}/${totalCount} 완료`}
                {cycle?.allDone && <span className="ml-2 text-green-600 font-semibold">🎉 사이클 완료!</span>}
              </div>
              <button onClick={generatePlan} disabled={planLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {planLoading ? '생성 중...' : '🤖 새 AI 플랜 생성'}
              </button>
            </div>
            {cycleLoading ? <p className="text-gray-500">로딩 중...</p> : !cycle?.hasCycle ? (
              <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-3">📋</p><p>AI 플랜을 생성하면 태스크 체크리스트가 표시됩니다.</p></div>
            ) : (
              <div className="space-y-3">
                {(['action', 'plan', 'warning'] as const).map(cat => {
                  const catTasks = tasks.filter((t: any) => t.category === cat)
                  if (!catTasks.length) return null
                  const style = CATEGORY_STYLES[cat]
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{style.label}</h3>
                      <div className="space-y-2">
                        {catTasks.map((task: any) => {
                          const isExpanded = expanded.has(task.id)
                          const svc = SERVICES.find(s => s.id === task.service)
                          return (
                            <div key={task.id} className={`border rounded-xl overflow-hidden ${style.bg}`}>
                              <div className="flex items-start gap-3 p-4">
                                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    {svc && <span className={`w-2 h-2 rounded-full ${svc.color} flex-shrink-0`} />}
                                    <span className="text-xs text-gray-500">{svc?.name || task.service}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>{style.label}</span>
                                  </div>
                                  <p className={`text-sm font-semibold ${task.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                                  <p className="text-sm text-gray-600 mt-1">{task.body}</p>
                                </div>
                                {(task.steps?.length > 0 || task.goal) && (
                                  <button onClick={() => toggleExpand(task.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg">
                                    {isExpanded ? '▲' : '▼'}
                                  </button>
                                )}
                              </div>
                              {isExpanded && (
                                <div className={`px-4 pb-4 border-t border-current border-opacity-10 ${style.stepBg}`}>
                                  {task.steps?.length > 0 && (
                                    <div className="mb-3 pt-3">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">실행 단계</p>
                                      <ol className="space-y-1">
                                        {task.steps.map((step: string, i: number) => (
                                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border text-xs flex items-center justify-center font-medium">{i+1}</span>
                                            <span>{step}</span>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {task.goal && (
                                    <div className="bg-white rounded-lg p-3 border">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">🎯 기대 결과</p>
                                      <p className="text-sm text-gray-700">{task.goal}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'ideas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${s.color}`} />
                  <h2 className="font-semibold text-gray-900">{s.name}</h2>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => downloadIdea(s.id)} className="text-xs text-gray-400 hover:text-gray-600">💾</button>
                    <button onClick={() => { setEditingIdea(s.id); setIdeaDraft(ideas[s.id] || '') }} className="text-xs text-blue-500 hover:text-blue-700">✏️ 편집</button>
                  </div>
                </div>
                {editingIdea === s.id ? (
                  <div>
                    <textarea value={ideaDraft} onChange={e => setIdeaDraft(e.target.value)}
                      className="w-full h-32 text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="아이디어를 자유롭게 적어보세요..." />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveIdea(s.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg">저장</button>
                      <button onClick={() => setEditingIdea(null)} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">취소</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                    {ideas[s.id] || <span className="text-gray-300">아직 아이디어가 없습니다. ✏️ 편집을 눌러 작성하세요.</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'arch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">💰 월별 비용 장부</h2>
                <div className="flex items-center gap-2">
                  <input type="month" value={costMonth} onChange={e => setCostMonth(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={() => setShowAddForm(v => !v)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                    {showAddForm ? '취소' : '+ 추가'}
                  </button>
                </div>
              </div>

              {showAddForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-2">빠른 선택</p>
                    <div className="flex flex-wrap gap-2">
                      {COST_PRESETS.map(p => (
                        <button key={p.label}
                          onClick={() => setCostForm(prev => ({ ...prev, item: p.item, service: p.service, currency: p.currency }))}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            costForm.item === p.item ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                          }`}>{p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">서비스</label>
                      <select value={costForm.service} onChange={e => setCostForm(p => ({ ...p, service: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {SERVICE_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">통화</label>
                      <select value={costForm.currency} onChange={e => setCostForm(p => ({ ...p, currency: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="USD">USD ($)</option>
                        <option value="KRW">KRW (₩)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">항목명</label>
                    <input value={costForm.item} onChange={e => setCostForm(p => ({ ...p, item: e.target.value }))}
                      placeholder="예: Vercel Pro, Gemini Pro 사용료"
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">금액</label>
                      <input type="number" value={costForm.amount} onChange={e => setCostForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">메모 (선택)</label>
                      <input value={costForm.note} onChange={e => setCostForm(p => ({ ...p, note: e.target.value }))}
                        placeholder="메모"
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <button onClick={addCost} disabled={costAdding || !costForm.item || !costForm.amount}
                    className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                    {costAdding ? '저장 중...' : '저장'}
                  </button>
                </div>
              )}

              {costsLoading ? (
                <p className="text-sm text-gray-400">로딩 중...</p>
              ) : costs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{costMonth} 등록된 비용이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs text-gray-500 font-medium py-2 pr-3">서비스</th>
                        <th className="text-left text-xs text-gray-500 font-medium py-2 pr-3">항목</th>
                        <th className="text-right text-xs text-gray-500 font-medium py-2 pr-3">금액</th>
                        <th className="text-left text-xs text-gray-500 font-medium py-2 pr-3">메모</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {costs.map(c => {
                        const svc = SERVICE_OPTIONS.find(s => s.id === c.service)
                        const dot = SERVICES.find(s => s.id === c.service)
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-2 pr-3"><div className="flex items-center gap-1.5">{dot && <span className={`w-2 h-2 rounded-full ${dot.color} flex-shrink-0`} />}<span className="text-xs text-gray-600">{svc?.name || c.service}</span></div></td>
                            <td className="py-2 pr-3 text-gray-900 font-medium">{c.item}</td>
                            <td className="py-2 pr-3 text-right font-semibold tabular-nums">{c.currency === 'USD' ? `$${Number(c.amount).toFixed(2)}` : `₩${Number(c.amount).toLocaleString()}`}</td>
                            <td className="py-2 pr-3 text-gray-400 text-xs">{c.note}</td>
                            <td className="py-2"><button onClick={() => deleteCost(c.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {costs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 justify-end">
                  {usdTotal > 0 && <div className="text-sm"><span className="text-gray-500">USD </span><span className="font-bold text-gray-900">${usdTotal.toFixed(2)}</span></div>}
                  {krwTotal > 0 && <div className="text-sm"><span className="text-gray-500">KRW </span><span className="font-bold text-gray-900">₩{krwTotal.toLocaleString()}</span></div>}
                  <div className="text-sm"><span className="text-gray-500">원화 환산 총계 </span><span className="font-bold text-blue-600">₩{totalKRW.toLocaleString()}</span><span className="text-xs text-gray-400 ml-1">(USD×1,450)</span></div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">🏗️ 예상 인프라 비용</h2>
              <p className="text-3xl font-bold text-blue-600">~$24/월 <span className="text-lg text-gray-400 font-normal">≈ ₩34,800</span></p>
              <p className="text-xs text-gray-400 mt-1">Vercel Pro $20 고정 + AI API 변동 ~$4</p>
            </div>
            {ARCH_DATA.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${SERVICES.find(s => s.id === a.id)?.color}`} />
                  <h2 className="font-semibold text-gray-900">{a.name}</h2>
                  <span className="ml-auto text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{a.cost}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1"><span className="font-medium">스택:</span> {a.stack}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">특징:</span> {a.notes}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'briefing' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">🌅 AI 모닝 브리핑</h2>
              {!briefing ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">오늘의 서비스 현황을 AI가 브리핑해드립니다.</p>
                  <button onClick={loadBriefing} disabled={briefingLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
                    {briefingLoading ? '브리핑 생성 중...' : '📋 브리핑 생성'}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{briefing}</p>
                  <div className="flex gap-3">
                    <button onClick={speak} className={`px-4 py-2 rounded-lg text-sm font-medium ${speaking ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {speaking ? '⏹ 중지' : '🔊 읽어주기'}
                    </button>
                    <button onClick={loadBriefing} disabled={briefingLoading}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
                      {briefingLoading ? '생성 중...' : '🔄 새로 생성'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
