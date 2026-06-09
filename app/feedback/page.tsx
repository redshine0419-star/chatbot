'use client'
import { useState, useEffect, useCallback } from 'react'

const SERVICES = [
  { key: 'marketerops', name: 'MarketerOps.ai', url: 'https://growweb.me', color: '#0969da', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', desc: 'SEO·GEO 진단 플랫폼' },
  { key: 'flavorsync', name: 'FlavorSync', url: 'https://flavorsync.me', color: '#16a34a', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500', desc: '레시피·냉장고 관리' },
  { key: 'taskgrid', name: 'TaskGrid', url: 'https://www.taskgrid.my', color: '#7c3aed', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', desc: '구글시트 칸반 보드' },
  { key: 'askhistory', name: 'AskHistory', url: 'https://askhistory.me', color: '#b45309', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', desc: 'AI 세계사 학습' },
]

function makeCaptcha(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const add = Math.random() > 0.5
  return add
    ? { question: `${a} + ${b}`, answer: a + b }
    : { question: `${a + b} - ${b}`, answer: a + b - b }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function FeedbackPage() {
  const [filter, setFilter] = useState<string>('all')
  const [posts, setPosts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // 폼 상태
  const [formService, setFormService] = useState('marketerops')
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [captcha, setCaptcha] = useState(makeCaptcha())
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [honeypot, setHoneypot] = useState('') // 봇 트랩
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitOk, setSubmitOk] = useState(false)

  const load = useCallback(async (svc: string, pg: number) => {
    setLoading(true)
    try {
      const url = svc === 'all'
        ? `/api/feedback?page=${pg}`
        : `/api/feedback?service=${svc}&page=${pg}`
      const data = await (await fetch(url, { cache: 'no-store' })).json()
      setPosts(data.rows ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(filter, page) }, [filter, page, load])

  function changeFilter(svc: string) {
    setFilter(svc)
    setPage(1)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: formService,
          nickname: nickname.trim(),
          content: content.trim(),
          captchaQuestion: captcha.question,
          captchaAnswer: Number(captchaAnswer),
          honeypot,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? '오류가 발생했습니다.'); return }
      setSubmitOk(true)
      setContent(''); setNickname(''); setCaptchaAnswer('')
      setCaptcha(makeCaptcha())
      setTimeout(() => { setSubmitOk(false); setShowForm(false); load(filter, 1) }, 1500)
    } finally { setSubmitting(false) }
  }

  const totalPages = Math.ceil(total / 20)
  const svcInfo = (key: string) => SERVICES.find(s => s.key === key)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">💬 사용자 의견 게시판</h1>
          <p className="text-sm text-gray-500 mt-1">4개 서비스에 대한 의견·제안·버그 제보를 남겨주세요. 비회원, 익명으로 작성 가능합니다.</p>
        </div>

        {/* 서비스 필터 탭 */}
        <div className="flex gap-1 flex-wrap mb-5 border-b border-gray-200 pb-1">
          <button onClick={() => changeFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors ${filter === 'all' ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            전체 <span className="text-xs text-gray-400 ml-1">{filter === 'all' ? total : ''}</span>
          </button>
          {SERVICES.map(s => (
            <button key={s.key} onClick={() => changeFilter(s.key)}
              className={`px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors flex items-center gap-1.5 ${filter === s.key ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.name}
            </button>
          ))}
        </div>

        {/* 글쓰기 버튼 */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(v => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showForm ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {showForm ? '✕ 닫기' : '✏️ 의견 작성'}
          </button>
        </div>

        {/* 작성 폼 */}
        {showForm && (
          <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 mb-5 space-y-4">
            <h2 className="font-semibold text-gray-900">의견 작성</h2>

            {/* 서비스 선택 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">서비스 선택</label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(s => (
                  <button key={s.key} type="button" onClick={() => setFormService(s.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${formService === s.key ? `${s.bg} border-current font-medium` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    style={formService === s.key ? { color: s.color, borderColor: s.color } : {}}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 닉네임 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">닉네임 <span className="text-gray-400 font-normal">(선택, 최대 30자)</span></label>
              <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={30}
                placeholder="익명"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">내용 <span className="text-gray-400 font-normal">(5~1000자)</span></label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} maxLength={1000} required
                placeholder="서비스 사용 후기, 개선 제안, 버그 제보 등 자유롭게 남겨주세요."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              <div className="text-right text-xs text-gray-400 mt-0.5">{content.length}/1000</div>
            </div>

            {/* 자동 입력 방지 캡차 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">자동 입력 방지: <span className="font-mono font-bold text-gray-900">{captcha.question} = ?</span></label>
              <input value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} required
                type="number" placeholder="답을 입력하세요"
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button type="button" onClick={() => { setCaptcha(makeCaptcha()); setCaptchaAnswer('') }}
                className="ml-2 text-xs text-gray-400 hover:text-gray-600">🔄 새 문제</button>
            </div>

            {/* 허니팟 (봇 트랩) — 사람 눈에 안 보임 */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
            </div>

            {submitError && <p className="text-sm text-red-500">{submitError}</p>}
            {submitOk && <p className="text-sm text-green-600 font-medium">✓ 의견이 등록되었습니다!</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={submitting || !content.trim() || !captchaAnswer}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {submitting ? '등록 중...' : '등록'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                취소
              </button>
            </div>
          </form>
        )}

        {/* 게시글 목록 */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">💬</p>
            <p>아직 의견이 없습니다. 첫 번째 의견을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p: any) => {
              const svc = svcInfo(p.service)
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {svc && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${svc.badge}`}>
                        {svc.name}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800">{p.nickname || '익명'}</span>
                    <span className="ml-auto text-xs text-gray-400">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.content}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              ← 이전
            </button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              다음 →
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-1">
          {SERVICES.map(s => (
            <a key={s.key} href={s.url} target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mx-3">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
