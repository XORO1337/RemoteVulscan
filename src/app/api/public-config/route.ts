import { NextResponse } from "next/server"

export function GET() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || ""
  const enableSocket = !!String(process.env.NEXT_PUBLIC_ENABLE_SOCKET || "")
    .toLowerCase()
    .match(/^(1|true|yes)$/)

  const captchaConfigured = Boolean(siteKey)

  return NextResponse.json({
    turnstileSiteKey: siteKey,
    enableSocket,
    captchaConfigured,
  })
}
