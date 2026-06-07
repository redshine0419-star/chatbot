'use client'
import { useState, useEffect, useRef } from 'react'

const SERVICES = [
  { id: 'marketerops', name: 'MarketerOps.ai', url: 'https://growweb.me', color: 'bg-blue-500' },
  { id: 'flavorsync', name: 'FlavorSync', url: 'https://flavorsync.me', color: 'bg-orange-500' },
  { id: 'taskgrid', name: 'TaskGrid', url: 'https://taskgrid.my', color: 'bg-green-500' },
  { id: 'askhistory', name: 'AskHistory', url: 'https://askhistory.me', color: 'bg-purple-500' },
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

const TABS = [
  { key: 'status', label: '현황' },
  { key: 'cycle', label: 'AI PM' },
  { key: 'ideas', label: '아이디어' },
  { key: 'arch', label: '비용·아키텍처' },
  { key: 'briefing', label: '모닝 브리핑' },
] as const

type TabKey = typeof TABS[number]['key']

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
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => setStatsData(d))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'cycle' && !cycle) loadCycle()
    if (tab === 'ideas') loadIdeas()
  }, [tab])

  async function loadCycle() {
    setCycleLoading(true)
    try {
      const res = await fetch('/api/dashboard/cycle-status')
      const data = await res.json()
      setCycle(data)
    } finally {
      setCycleLoading(false)
    }
  }

  async function loadIdeas() {
    const res = await fetch('/api/dashboard/ideas')
    const data = await res.json()
    setIdeas(Object.fromEntries(Object.entries(data).map(([k, v]: any) => [k, v.content || ''])))
  }

  async function generatePlan() {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/dashboard/plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert('플랜 생성 실패: ' + (data.error || res.status)); return }
      await loadCycle()
    } finally {
      setPlanLoading(false)
    }
  }

  async function toggleTask(taskId: string) {
    if (!cycle?.cycle?.id) return
    const res = await fetch('/api/dashboard/task-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId: cycle.cycle.id, taskId }),
    })
    const data = await res.json()
    if (data.ok) {
      setCycle((prev: any) => ({ ...prev, cycle: { ...prev.cycle, tasks: data.tasks }, doneCount: data.doneCount, allDone: data.allDone }))
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function saveIdea(serviceId: string) {
    await fetch('/api/dashboard/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: serviceId, content: ideaDraft }),
    })
    setIdeas(prev => ({ ...prev, [serviceId]: ideaDraft }))
    setEditingIdea(null)
  }

  function downloadIdea(serviceId: string) {
    const blob = new Blob([ideas[serviceId] || ''], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${serviceId}-ideas.txt`
    a.click()
  }

  async function loadBriefing() {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/dashboard/briefing')
      const data = await res.json()
      setBriefing(data.briefing || '')
    } finally {
      setBriefingLoading(false)
    }
  }

  function speak() {
    if (!briefing) return
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const u = new SpeechSynthesisUtterance(briefing)
    u.lang = 'ko-KR'; u.rate = 1.0
    u.onend = () => setSpeaking(false)
    synthRef.current = u
    window.speechSynthesis.speak(u)
    setSpeaking(true)
  }

  // Map stats by service key
  const statsMap: Record<string, any> = {}
  const ga4Map: Record<string, any> = {}
  if (statsData) {
    for (const s of statsData.stats || []) statsMap[s.service || s.key] = s
    for (const g of statsData.ga4 || []) ga4Map[g.property] = g
  }

  const tasks = cycle?.cycle?.tasks || []
  const doneCount = cycle?.doneCount ?? 0
  const totalCount = cycle?.totalCount ?? tasks.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">서비스 통합 대시보드</h1>

        {/* Tabs — horizontal scroll on mobile */}
        <div className="overflow-x-auto mb-6 border-b border-gray-200">
          <div className="flex gap-1 min-w-max">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* STATUS */}
        {tab === 'status' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map(s => {
              const d = statsMap[s.id]
              const g = ga4Map[s.id]
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-3 h-3 rounded-full ${s.color}`} />
                    <h2 className="font-semibold text-gray-900">{s.name}</h2>
                    <a href={s.url} target="_blank" className="ml-auto text-xs text-gray-400 hover:underline">{s.url}</a>
                  </div>
                  {statsLoading ? (
                    <p className="text-sm text-gray-400">로딩 중...</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-500 text-xs mb-1">전체 블로그</div>
                        <div className="font-bold text-lg">{d?.blog?.total ?? d?.totalPosts ?? '-'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-500 text-xs mb-1">이번 주 신규</div>
                        <div className="font-bold text-lg">{d?.blog?.recentWeek ?? d?.weeklyPosts ?? '-'}</div>
                      </div>
                      {g && (
                        <>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-500 text-xs mb-1">GA4 7일 사용자</div>
                            <div className="font-bold text-lg">{g.users?.toLocaleString()}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-gray-500 text-xs mb-1">GA4 7일 세션</div>
                            <div className="font-bold text-lg">{g.sessions?.toLocaleString()}</div>
                          </div>
                        </>
                      )}
                      {d?.error && <div className="col-span-2 text-xs text-red-400">{d.error}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* CYCLE */}
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
            {cycleLoading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : !cycle?.hasCycle ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p>AI 플랜을 생성하면 태스크 체크리스트가 표시됩니다.</p>
              </div>
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
                                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)}
                                  className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0" />
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
                                  <button onClick={() => toggleExpand(task.id)}
                                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg">
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

        {/* IDEAS */}
        {tab === 'ideas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${s.color}`} />
                  <h2 className="font-semibold text-gray-900">{s.name}</h2>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => downloadIdea(s.id)} className="text-xs text-gray-400 hover:text-gray-600">💾</button>
                    <button onClick={() => { setEditingIdea(s.id); setIdeaDraft(ideas[s.id] || '') }}
                      className="text-xs text-blue-500 hover:text-blue-700">✏️ 편집</button>
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

        {/* ARCH */}
        {tab === 'arch' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">💰 총 인프라 비용</h2>
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

        {/* BRIEFING */}
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
                    <button onClick={speak}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${speaking ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
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
