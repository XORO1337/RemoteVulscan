import { NextResponse } from "next/server"

export function GET() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || ""
  const enableSocket = !!String(process.env.NEXT_PUBLIC_ENABLE_SOCKET || "")
    .toLowerCase()
    .match(/^(1|true|yes)$/)

  const captchaConfigured = Boolean(siteKey)

  // Log for debugging (remove in production)
  console.log('Public config requested:', {
    hasSiteKey: !!siteKey,
    siteKeyPrefix: siteKey ? siteKey.substring(0, 10) + '...' : 'none',
    enableSocket,
    captchaConfigured
  })

  return NextResponse.json({
    turnstileSiteKey: siteKey,
    enableSocket,
    captchaConfigured,
  })
}
