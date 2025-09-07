import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    enableSocket: (process.env.NEXT_PUBLIC_ENABLE_SOCKET || 'true').toLowerCase() === 'true',
  });
}
