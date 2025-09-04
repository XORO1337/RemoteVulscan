// Frontend no longer instantiates Prisma directly.
// This file is retained as a shim to avoid import errors in legacy components.
// All data access should go through the backend REST API.
export const db = null as any;
export function deprecatedFrontendDbAccess() {
  throw new Error('Direct DB access removed. Use backend API endpoints instead.');
}
