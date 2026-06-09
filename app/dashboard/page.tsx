'use client';

import { useState, useEffect, useCallback } from 'react';

const SERVICES = [
  {
    name: 'MarketerOps.ai',
    url: 'https://growweb.me',
    statsUrl: 'https://growweb.me/api/stats',
    color: '#0969da',
    bg: '#dbeafe',
    emoji: '📊',
    desc: 'SEO · GEO 진단 플랫폼',
  },
  {
    name: 'FlavorSync',
    url: 'https://flavorsync.me',
    statsUrl: 'https://flavorsync.me/api/stats',
    color: '#16a34a',
    bg: '#dcfce7',
    emoji: '🍳',
    desc: '냉장고 AI 레시피 추천',
  },
  {
    name: 'TaskGrid',
    url: 'https://www.taskgrid.my',
    statsUrl: 'https://www.taskgrid.my/api/stats',
    color: '#7c3aed',
    bg: '#ede9fe',
    emoji: '📋',
    desc: '무료 칸반 프로젝트 관리',
  },
  {
    name: 'AskHistory',
    url: 'https://askhistory.me',
    statsUrl: 'https://askhistory.me/api/stats',
    color: '#b45309',
    bg: '#fef3c7',
    emoji: '📜',
    desc: '세계사 AI 퀴즈 · Q&A',
  },
];

const AUTOMATION_PHASES = [
  {
    phase: '1단계',
    title: '롱테일 SEO 콘텐츠 자동화',
    color: '#0969da',
    items: [
      { label: '키워드 클러스터 테이블 구축', detail: 'blog_keywords + cluster 컬럼 · 4개 서비스 DB' },
      { label: '자동발행 파이프라인 고도화', detail: '클러스터 균형 선택 · 내부링크 삽입 · CTA 자동 추가 · Slack 알림' },
      { label: 'Google Search Console 자동 최적화 루프', detail: '11~20위 키워드 자동 감지 → AI 보강 → IndexNow 재인덱싱 (매주 월요일)' },
    ],
  },
  {
    phase: '2단계',
    title: '사용자 획득 자동화',
    color: '#16a34a',
    items: [
      { label: '이메일 캡처 + Resend 웰컴 시퀀스', detail: '/api/subscribe · email_subscribers 테이블 · D+0 웰컴 메일 · 4개 서비스' },
      { label: '이메일 넛지 시퀀스 (D+3/7/14)', detail: 'Resend API · 기능 소개 → 팁 → 재방문 유도 · 4개 서비스 크론' },
      { label: 'X (Twitter) 자동 트윗 연동', detail: 'OAuth 1.0a HMAC-SHA1 · 블로그 발행 시 자동 트윗 · 서비스별 해시태그 · 4개 서비스' },
    ],
  },
  {
    phase: '3단계',
    title: '리텐션 + 수익 최적화',
    color: '#b45309',
    items: [
      { label: 'Web Push 알림 자동화', detail: 'FCM · FlavorSync: 유통기한 D-3 + 오늘의 레시피 / TaskGrid: 마감 D-1 알림' },
      { label: 'AdSense 수익 최적화 리포트', detail: 'GA4 체류시간 상위 20% 페이지 감지 · 이탈률 80%+ CTA 전환 권장 · 매월 1일 Slack 발송' },
      { label: 'AI 기반 콘텐츠 개인화', detail: 'FlavorSync: 즐겨찾기 기반 추천 메일 / AskHistory: 취약 시대 복습 알림 (Resend)' },
    ],
  },
  {
    phase: '4단계',
    title: '측정 & 반복 (상시)',
    color: '#7c3aed',
    items: [
      { label: '통합 마케팅 대시보드 지표', detail: '이메일 구독자 · 블로그 총수 · 주간 신규 · 4개 서비스 실시간 집계' },
      { label: 'UTM 파라미터 자동 삽입', detail: 'utm_source=blog&utm_medium=cta&utm_campaign=organic · 모든 CTA 링크 적용' },
      { label: 'A/B 타이틀 테스트 자동화', detail: 'blog_ab_tests 테이블 · AI 대안 제목 생성 · 7일 후 CTR 비교 → 자동 교체 · 매주 월요일' },
      { label: '월간 마케팅 리뷰 자동화', detail: 'Gemini AI 성과 요약 + 다음달 액션 플랜 자동 생성 → Slack · 매월 1일' },
    ],
  },
];

const CRON_SCHEDULE = [
  { service: '전체', path: '/api/blog/cron (or /api/generate-blog-post)', schedule: '매일 00:00 UTC', desc: '블로그 자동 발행 + CTA + 내부링크 + Slack + X 트윗' },
  { service: '전체', path: '/api/cron/gsc-optimize', schedule: '매주 월요일 02:00 UTC', desc: 'GSC 11~20위 키워드 AI 보강 → IndexNow 재인덱싱' },
  { service: '전체', path: '/api/cron/email-sequence', schedule: '매일 01:00 UTC', desc: 'D+3/7/14 이메일 넛지 시퀀스 발송' },
  { service: 'FlavorSync · TaskGrid', path: '/api/cron/push-notify', schedule: '매일 22:00 UTC', desc: '유통기한 D-3 알림 + 오늘의 레시피 / 마감 D-1 알림' },
  { service: '전체', path: '/api/cron/adsense-report', schedule: '매월 1일 03:00 UTC', desc: 'GA4 체류시간/이탈률 분석 → AdSense 최적화 리포트 Slack' },
  { service: '전체', path: '/api/cron/ab-test-resolve', schedule: '매주 월요일 04:00 UTC', desc: 'A/B 테스트 7일 결과 집계 → 승자 제목 자동 교체 + 신규 테스트 생성' },
  { service: '전체', path: '/api/cron/monthly-review', schedule: '매월 1일 05:00 UTC', desc: 'Gemini AI 월간 성과 요약 + 액션 플랜 → Slack' },
  { service: 'FlavorSync', path: '/api/cron/personalized-recs', schedule: '매주 수요일 10:00 UTC', desc: '즐겨찾기 기반 개인화 레시피 추천 메일' },
  { service: 'AskHistory', path: '/api/cron/weak-era-alert', schedule: '매주 화요일 11:00 UTC', desc: '취약 시대 복습 알림 메일' },
];

interface ServiceStat {
  blog?: { total?: number; recentWeek?: number };
  emailSubscribers?: number;
  error?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<(ServiceStat | null)[]>([null, null, null, null]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const results = await Promise.all(
      SERVICES.map((s) =>
        fetch(s.statsUrl, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({ error: '연결 실패' }))
      )
    );
    setStats(results);
    setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
    setStatsLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">🚀 마케팅 자동화 대시보드</h1>
            <p className="text-sm text-gray-500 mt-0.5">4개 서비스 자동화 현황 · MarketerOps · FlavorSync · TaskGrid · AskHistory</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-gray-400">업데이트: {lastUpdated}</span>}
            <button
              onClick={fetchStats}
              disabled={statsLoading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {statsLoading ? '로딩중...' : '새로고침'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* Service Stats Cards */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">실시간 서비스 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map((svc, i) => {
              const d = stats[i];
              return (
                <a
                  key={svc.name}
                  href={svc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md transition-shadow"
                  style={{ borderTopColor: svc.color, borderTopWidth: 3 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{svc.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: svc.color }}>{svc.name}</div>
                      <div className="text-xs text-gray-400">{svc.desc}</div>
                    </div>
                  </div>
                  {statsLoading && !d ? (
                    <div className="space-y-1.5">
                      {[1,2,3].map(n => <div key={n} className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}
                    </div>
                  ) : d && !d.error ? (
                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>📝 블로그 총수</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{d.blog?.total ?? '—'}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span>📅 주간 신규</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{d.blog?.recentWeek ?? '—'}개</span>
                      </div>
                      {typeof d.emailSubscribers === 'number' && (
                        <div className="flex justify-between">
                          <span>📧 이메일 구독</span>
                          <span className="font-semibold text-indigo-600">{d.emailSubscribers.toLocaleString()}명</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-red-400">{d?.error ?? '연결 중...'}</div>
                  )}
                </a>
              );
            })}
          </div>
        </section>

        {/* Automation Checklist */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">자동화 구축 완료 현황</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {AUTOMATION_PHASES.map((phase) => (
              <div
                key={phase.phase}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: phase.color + '15', borderBottom: `1px solid ${phase.color}30` }}>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: phase.color }}>
                    {phase.phase}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{phase.title}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {phase.items.map((item, i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: phase.color + '20' }}>
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4.5L4 7.5L10 1" stroke={phase.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cron Schedule */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">크론 스케줄 (Vercel Cron)</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">서비스</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">엔드포인트</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">스케줄</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {CRON_SCHEDULE.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{row.service}</td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">
                          {row.path}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.schedule}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Environment Variables Needed */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">신규 추가 환경변수 (각 서비스 Vercel에 설정 필요)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: '공통 (4개 서비스)',
                vars: [
                  { name: 'SLACK_WEBHOOK_URL', desc: 'Slack 알림 웹훅 URL' },
                  { name: 'RESEND_API_KEY', desc: 'Resend 이메일 API 키 (무료 3,000건/월)' },
                  { name: 'GSC_REFRESH_TOKEN', desc: 'Google Search Console OAuth Refresh Token' },
                  { name: 'TWITTER_API_KEY', desc: 'X(Twitter) API Key' },
                  { name: 'TWITTER_API_SECRET', desc: 'X(Twitter) API Secret' },
                  { name: 'TWITTER_ACCESS_TOKEN', desc: 'X(Twitter) Access Token' },
                  { name: 'TWITTER_ACCESS_SECRET', desc: 'X(Twitter) Access Secret' },
                  { name: 'INDEXNOW_KEY', desc: 'IndexNow API Key (선택, Bing/Yandex 재인덱싱)' },
                ],
                color: '#0969da',
              },
              {
                title: 'FlavorSync · TaskGrid · AskHistory',
                vars: [
                  { name: 'GA4_PROPERTY_ID', desc: 'GA4 속성 ID (properties/XXXXXX)' },
                  { name: 'GOOGLE_CLIENT_ID', desc: 'Google OAuth Client ID' },
                  { name: 'GOOGLE_CLIENT_SECRET', desc: 'Google OAuth Client Secret' },
                ],
                color: '#16a34a',
              },
              {
                title: 'FlavorSync · TaskGrid (Web Push)',
                vars: [
                  { name: 'FIREBASE_SERVER_KEY', desc: 'FCM Server Key (Firebase Console → 프로젝트 설정)' },
                ],
                color: '#7c3aed',
              },
              {
                title: 'AdSense 수익 리포트 (선택)',
                vars: [
                  { name: 'ADSENSE_PUBLISHER_ID', desc: 'AdSense Publisher ID (pub-XXXXXXXX)' },
                  { name: 'ADSENSE_ACCESS_TOKEN', desc: 'AdSense API Access Token' },
                ],
                color: '#b45309',
              },
            ].map((group) => (
              <div key={group.title} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-semibold" style={{ backgroundColor: group.color + '15', color: group.color, borderBottom: `1px solid ${group.color}30` }}>
                  {group.title}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.vars.map((v) => (
                    <div key={v.name} className="px-4 py-2 flex items-start gap-3">
                      <code className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded whitespace-nowrap">{v.name}</code>
                      <span className="text-xs text-gray-500">{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          마케팅 자동화 전체 완료 · 4단계 · 9개 크론 · 4개 서비스
        </div>
      </div>
    </div>
  );
}
