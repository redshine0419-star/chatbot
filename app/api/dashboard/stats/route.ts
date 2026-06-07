import { NextResponse } from 'next/server';
import { getGA4Token, saveGA4Token } from '@/lib/ga4-token';

const SERVICES = [
  { key: 'marketerops', url: 'https://growweb.me/api/stats' },
  { key: 'flavorsync', url: 'https://flavorsync.me/api/stats' },
  { key: 'taskgrid', url: 'https://taskgrid.my/api/stats' },
  { key: 'askhistory', url: 'https://askhistory.me/api/stats' },
];

const GA4_PROPERTIES = [
  { key: 'marketerops', propertyId: '538101783', domain: 'growweb.me' },
  { key: 'flavorsync', propertyId: '539541349', domain: 'flavorsync.me' },
  { key: 'taskgrid', propertyId: '540455600', domain: 'taskgrid.my' },
  { key: 'askhistory', propertyId: '540450852', domain: 'askhistory.me' },
];

async function fetchServiceStats(service: { key: string; url: string }) {
  try {
    const res = await fetch(service.url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return { service: service.key, error: (e as Error).message, blog: { total: 0, recentWeek: 0, recent: [] } };
  }
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  return res.json();
}

async function fetchGA4Report(propertyId: string, accessToken: string) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
        limit: 20,
      }),
    },
  );
  return res.ok ? res.json() : null;
}

export async function GET() {
  const [stats, tokenData] = await Promise.all([
    Promise.all(SERVICES.map(fetchServiceStats)),
    getGA4Token(),
  ]);

  let ga4Data: unknown[] = [];
  const ga4Connected = !!tokenData;

  if (tokenData) {
    let accessToken = tokenData.access_token as string;
    const expiry = new Date(tokenData.savedAt as string).getTime() + ((tokenData.expires_in as number) ?? 3600) * 1000;
    if (Date.now() > expiry - 300000 && tokenData.refresh_token) {
      const refreshed = await refreshAccessToken(tokenData.refresh_token as string);
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        await saveGA4Token({ ...tokenData, access_token: accessToken, savedAt: new Date().toISOString() });
      }
    }

    ga4Data = await Promise.all(
      GA4_PROPERTIES.map(async (prop) => {
        const raw = await fetchGA4Report(prop.propertyId, accessToken);
        if (!raw?.rows) return { property: prop.key, domain: prop.domain, sessions: 0, users: 0, pageViews: 0, topPages: [], channelBreakdown: [] };
        let sessions = 0, users = 0, pageViews = 0;
        const pageMap: Record<string, number> = {};
        const channelMap: Record<string, number> = {};
        for (const row of raw.rows) {
          const page = row.dimensionValues[0].value;
          const channel = row.dimensionValues[1].value;
          const s = Number(row.metricValues[0].value);
          const u = Number(row.metricValues[1].value);
          const pv = Number(row.metricValues[2].value);
          sessions += s; users += u; pageViews += pv;
          pageMap[page] = (pageMap[page] ?? 0) + pv;
          channelMap[channel] = (channelMap[channel] ?? 0) + s;
        }
        return {
          property: prop.key, domain: prop.domain, sessions, users, pageViews,
          topPages: Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, views]) => ({ page, views })),
          channelBreakdown: Object.entries(channelMap).sort((a, b) => b[1] - a[1]).map(([channel, s]) => ({ channel, sessions: s })),
        };
      }),
    );
  }

  return NextResponse.json({ stats, ga4: ga4Data, ga4Connected, plan: '', generatedAt: new Date().toISOString() });
}
