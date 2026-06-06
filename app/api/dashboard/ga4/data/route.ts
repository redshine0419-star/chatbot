import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const GA4_PROPERTIES = [
  { key: 'marketerops', propertyId: '538101783', domain: 'growweb.me' },
  { key: 'flavorsync', propertyId: '539541349', domain: 'flavorsync.me' },
  { key: 'taskgrid', propertyId: '540455600', domain: 'taskgrid.my' },
  { key: 'askhistory', propertyId: '540450852', domain: 'askhistory.me' },
];

async function getStoredToken() {
  try {
    const { blobs } = await list({ prefix: 'dashboard-ga4-token.json' });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function refreshToken(refreshToken: string) {
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

async function fetchGA4(propertyId: string, accessToken: string) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
        limit: 20,
      }),
    },
  );
  return res.ok ? res.json() : null;
}

export async function GET() {
  const tokenData = await getStoredToken();
  if (!tokenData) {
    return NextResponse.json({ connected: false, data: [] });
  }

  let accessToken = tokenData.access_token;
  const expiry = new Date(tokenData.savedAt).getTime() + (tokenData.expires_in ?? 3600) * 1000;
  if (Date.now() > expiry - 300000 && tokenData.refresh_token) {
    const refreshed = await refreshToken(tokenData.refresh_token);
    if (refreshed.access_token) accessToken = refreshed.access_token;
  }

  const results = await Promise.all(
    GA4_PROPERTIES.map(async (prop) => {
      const raw = await fetchGA4(prop.propertyId, accessToken);
      if (!raw?.rows) {
        return { property: prop.key, domain: prop.domain, sessions: 0, users: 0, pageViews: 0, avgEngagementTime: 0, topPages: [], channelBreakdown: [] };
      }

      let sessions = 0, users = 0, pageViews = 0;
      const pageMap: Record<string, number> = {};
      const channelMap: Record<string, number> = {};

      for (const row of raw.rows) {
        const page = row.dimensionValues[0].value;
        const channel = row.dimensionValues[1].value;
        const s = Number(row.metricValues[0].value);
        const u = Number(row.metricValues[1].value);
        const pv = Number(row.metricValues[2].value);
        sessions += s;
        users += u;
        pageViews += pv;
        pageMap[page] = (pageMap[page] ?? 0) + pv;
        channelMap[channel] = (channelMap[channel] ?? 0) + s;
      }

      const topPages = Object.entries(pageMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, views]) => ({ page, views }));

      const channelBreakdown = Object.entries(channelMap)
        .sort((a, b) => b[1] - a[1])
        .map(([channel, s]) => ({ channel, sessions: s }));

      return { property: prop.key, domain: prop.domain, sessions, users, pageViews, avgEngagementTime: 0, topPages, channelBreakdown };
    }),
  );

  return NextResponse.json({ connected: true, data: results });
}
