type VerifyResponse = {
  success: boolean
  "error-codes"?: string[]
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

/**
 * Server-side verification for Cloudflare Turnstile.
 * Uses TURNSTILE_SECRET_KEY from environment. Returns a non-throwing result.
 */
export async function verifyTurnstileToken(token?: string) {
  if (!token) return { ok: false, errors: ["missing-token"] as string[] }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { ok: false, errors: ["missing-secret-key"] as string[] }

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
      cache: "no-store",
    })
    const data = (await resp.json()) as VerifyResponse
    if (!data.success) {
      return { ok: false, errors: data["error-codes"] || ["verification-failed"] }
    }
    return { ok: true as const }
  } catch (err: any) {
    return { ok: false, errors: ["network-error", err?.message].filter(Boolean) as string[] }
  }
}
