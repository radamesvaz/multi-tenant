import { envConfig } from '../config/env';

/** Resolve relative media paths from the API against `VITE_API_BASE_URL`. */
export function resolveTenantMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u) || u.startsWith('data:') || u.startsWith('blob:')) return u;
  return `${envConfig.apiBaseUrl}${u.startsWith('/') ? u : `/${u}`}`;
}
