import { getServerEnv } from "@/lib/env/server"

type VerifyResponse = {
  success: boolean
  "error-codes"?: string[]
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

/**
 * Verify a Turnstile token on the server.
 * Returns { ok: boolean, errors?: string[] } without throwing on remote errors.
 */
export async function verifyTurnstileToken(token?: string) {
  if (!token) {
    return { ok: false, errors: ["missing-token"] as string[] }
  }

  const { TURNSTILE_SECRET_KEY } = getServerEnv()

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }).toString(),
      // No caching of verification
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
