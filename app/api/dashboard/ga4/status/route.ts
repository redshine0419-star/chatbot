import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'dashboard-ga4-token.json' });
    if (blobs.length === 0) {
      return NextResponse.json({ connected: false, reason: 'no blob found' });
    }
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ connected: false, reason: `fetch failed: ${res.status}` });
    const token = await res.json();
    return NextResponse.json({
      connected: true,
      savedAt: token.savedAt,
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
      blobUrl: blobs[0].url,
    });
  } catch (e) {
    return NextResponse.json({ connected: false, reason: String(e) });
  }
}
