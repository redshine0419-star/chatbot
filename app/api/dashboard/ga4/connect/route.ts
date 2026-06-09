import { NextResponse } from 'next/server';

const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/dashboard/ga4/callback`,
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
