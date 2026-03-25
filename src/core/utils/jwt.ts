/**
 * Decodes JWT payload (without signature verification).
 * Client-side helper only for reading claims (e.g. role_id).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const segment = parts[1];
    const padded = segment.length % 4 === 0 ? segment : segment + '='.repeat(4 - (segment.length % 4));
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function roleIdFromJwt(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const raw = payload.role_id;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** JWT `exp` uses UTC epoch seconds. Without a valid `exp`, token is treated as not expired. */
export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;

  const raw = payload.exp;
  let expSec: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    expSec = raw;
  } else if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    expSec = Number.isFinite(n) ? n : null;
  }
  if (expSec === null) {
    return false;
  }
  return Date.now() / 1000 >= expSec;
}
