// Central helpers for backend API base URL resolution
// - On the client: use NEXT_PUBLIC_API_URL
// - On the server (SSR/Edge): prefer BACKEND_INTERNAL_URL, then NEXT_PUBLIC_API_URL
// Fallback to localhost for local development.
export function getBackendBaseUrl(): string {
  const pub = process.env.NEXT_PUBLIC_API_URL || ''
  const internal = process.env.BACKEND_INTERNAL_URL || process.env.API_BASE_URL || ''

  const base = typeof window === 'undefined'
    ? (internal || pub || 'http://backend:8000')
    : (pub || 'http://localhost:8000')

  return base.replace(/\/$/, '')
}

export function getBackendApiBase(): string {
  return `${getBackendBaseUrl()}/api/v1`
}

export function buildApiUrl(path: string): string {
  const base = getBackendApiBase()
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}