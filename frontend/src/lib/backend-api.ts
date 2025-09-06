// Central helper for backend API base URL
export function getBackendApiBase() {
  const root = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
  return `${root}/api/v1`;
}

export function buildApiUrl(path: string) {
  const base = getBackendApiBase();
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}