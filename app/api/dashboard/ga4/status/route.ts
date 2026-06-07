import { NextResponse } from 'next/server';
import { getGA4Token } from '@/lib/ga4-token';

export async function GET() {
  try {
    const token = await getGA4Token();
    if (!token) return NextResponse.json({ connected: false, reason: 'no token in DB' });
    return NextResponse.json({
      connected: true,
      savedAt: token.savedAt,
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
    });
  } catch (e) {
    return NextResponse.json({ connected: false, reason: String(e) });
  }
}
