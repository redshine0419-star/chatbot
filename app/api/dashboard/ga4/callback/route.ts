import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const GA4_PROPERTIES = [
  { key: 'marketerops', propertyId: '538101783', domain: 'growweb.me' },
  { key: 'flavorsync', propertyId: '539541349', domain: 'flavorsync.me' },
  { key: 'taskgrid', propertyId: '540455600', domain: 'taskgrid.my' },
  { key: 'askhistory', propertyId: '540450852', domain: 'askhistory.me' },
];

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect('/dashboard?ga4=error');
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-chatbot-domain.vercel.app';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/dashboard/ga4/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('토큰 발급 실패');

    await put(
      'dashboard-ga4-token.json',
      JSON.stringify({
        ...tokens,
        properties: GA4_PROPERTIES,
        savedAt: new Date().toISOString(),
      }),
      { access: 'public', addRandomSuffix: false, allowOverwrite: true },
    );

    return NextResponse.redirect(`${appUrl}/dashboard?ga4=connected`);
  } catch (e) {
    console.error('GA4 callback error:', e);
    return NextResponse.redirect('/dashboard?ga4=error');
  }
}
