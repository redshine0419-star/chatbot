import { NextResponse } from 'next/server'

const SERVICES = [
  {
    key: 'marketerops',
    name: 'MarketerOps.ai',
    statsUrl: 'https://growweb.me/api/stats',
    blogUrl: 'https://growweb.me/api/blog/posts?lang=ko',
    cronPaths: ['/api/blog/cron', '/api/cron/adsense-report', '/api/cron/ab-test-resolve', '/api/cron/monthly-review'],
  },
  {
    key: 'flavorsync',
    name: 'FlavorSync',
    statsUrl: 'https://flavorsync.me/api/stats',
    blogUrl: 'https://flavorsync.me/api/blog-posts',
    cronPaths: ['/api/generate-blog-post', '/api/cron/adsense-report', '/api/cron/ab-test-resolve', '/api/cron/monthly-review', '/api/cron/personalized-recs'],
  },
  {
    key: 'taskgrid',
    name: 'TaskGrid',
    statsUrl: 'https://www.taskgrid.my/api/stats',
    blogUrl: 'https://www.taskgrid.my/api/blog-list',
    cronPaths: ['/api/cron/blog', '/api/cron/adsense-report', '/api/cron/ab-test-resolve', '/api/cron/monthly-review'],
  },
  {
    key: 'askhistory',
    name: 'AskHistory',
    statsUrl: 'https://askhistory.me/api/stats',
    blogUrl: 'https://askhistory.me/api/posts?limit=1',
    cronPaths: ['/api/cron/generate', '/api/cron/adsense-report', '/api/cron/ab-test-resolve', '/api/cron/monthly-review', '/api/cron/weak-era-alert'],
  },
]

async function checkService(svc: typeof SERVICES[0]) {
  const start = Date.now()
  try {
    const [statsRes, blogRes] = await Promise.all([
      fetch(svc.statsUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(svc.blogUrl, { signal: AbortSignal.timeout(8000) }),
    ])
    const latency = Date.now() - start
    let stats: any = null
    let blogCount: number | null = null
    let latestPostDate: string | null = null

    if (statsRes.ok) {
      stats = await statsRes.json().catch(() => null)
    }

    if (blogRes.ok) {
      const blogData = await blogRes.json().catch(() => null)
      if (Array.isArray(blogData)) {
        blogCount = blogData.length
        const latest = blogData[0]
        latestPostDate = latest?.published_at || latest?.createdAt || latest?.date || latest?.publishedAt || null
      } else if (blogData?.posts) {
        blogCount = blogData.posts.length
        latestPostDate = blogData.posts[0]?.createdAt || null
      }
    }

    return {
      key: svc.key,
      name: svc.name,
      status: statsRes.ok ? 'up' : 'degraded',
      latency,
      blogTotal: stats?.blog?.total ?? stats?.totalPosts ?? blogCount ?? null,
      emailSubscribers: stats?.emailSubscribers ?? null,
      latestPostDate,
      cronPaths: svc.cronPaths,
    }
  } catch (e) {
    return {
      key: svc.key,
      name: svc.name,
      status: 'down',
      latency: Date.now() - start,
      blogTotal: null,
      emailSubscribers: null,
      latestPostDate: null,
      cronPaths: svc.cronPaths,
      error: String(e),
    }
  }
}

export async function GET() {
  const results = await Promise.all(SERVICES.map(checkService))
  return NextResponse.json({ checkedAt: new Date().toISOString(), results })
}
