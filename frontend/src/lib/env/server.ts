export type ServerEnv = {
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY?: string
  ENABLE_SOCKET: boolean
}

function missing(name: string): never {
  throw new Error(
    `[Config] Required env var ${name} is missing. Please add it in Project Settings > Environment Variables.`,
  )
}

/**
 * Reads and validates required server-side env variables at runtime.
 * Throws a helpful error if something is missing to avoid silent failures.
 */
export function getServerEnv(): ServerEnv {
  const secret = process.env.TURNSTILE_SECRET_KEY || ""
  const site = process.env.TURNSTILE_SITE_KEY || ""
  const enableSocket = (process.env.NEXT_PUBLIC_ENABLE_SOCKET || "").toLowerCase() === "true"

  return {
    TURNSTILE_SECRET_KEY: secret || missing("TURNSTILE_SECRET_KEY"),
    TURNSTILE_SITE_KEY: site || undefined,
    ENABLE_SOCKET: enableSocket,
  }
}
