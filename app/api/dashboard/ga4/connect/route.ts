import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-chatbot-domain.vercel.app'}/api/dashboard/ga4/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: 'dashboard',
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
