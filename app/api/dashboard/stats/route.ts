import { NextResponse } from 'next/server';

const SERVICES = [
  { key: 'marketerops', url: 'https://growweb.me/api/stats' },
  { key: 'flavorsync', url: 'https://flavorsync.me/api/stats' },
  { key: 'taskgrid', url: 'https://taskgrid.my/api/stats' },
  { key: 'askhistory', url: 'https://askhistory.me/api/stats' },
];

async function fetchServiceStats(service: { key: string; url: string }) {
  try {
    const res = await fetch(service.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return {
      service: service.key,
      error: (e as Error).message,
      blog: { total: 0, recentWeek: 0, recent: [] },
    };
  }
}

export async function GET() {
  const stats = await Promise.all(SERVICES.map(fetchServiceStats));
  return NextResponse.json({
    stats,
    ga4: [],
    ga4Connected: false,
    plan: '',
    generatedAt: new Date().toISOString(),
  });
}
