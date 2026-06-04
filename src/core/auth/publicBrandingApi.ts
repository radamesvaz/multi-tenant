import { envConfig } from '../config';
import type { TenantBrandingApiResponse } from '../models';

export class PublicTenantUnavailableError extends Error {
  readonly status = 404;

  constructor(message = PUBLIC_STORE_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = 'PublicTenantUnavailableError';
  }
}

export class PublicBrandingApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicBrandingApiError';
    this.status = status;
  }
}

/** Aligned with admin canceled-store copy; shown when public branding returns 404. */
export const PUBLIC_STORE_UNAVAILABLE_MESSAGE =
  'Esta tienda no está disponible en este momento.';

const GENERIC_LOAD_ERROR_MESSAGE =
  'No se pudo cargar la tienda. Comprobá tu conexión e intentá de nuevo.';

async function parseErrorMessage(response: Response, bodyText: string): Promise<string> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json') || bodyText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
      if (typeof parsed.message === 'string' && parsed.message.length > 0) {
        return parsed.message;
      }
      if (typeof parsed.error === 'string' && parsed.error.length > 0) {
        return parsed.error;
      }
    } catch {
      /* use plain text below */
    }
  }

  if (response.status === 404) {
    return PUBLIC_STORE_UNAVAILABLE_MESSAGE;
  }

  return bodyText.trim() || GENERIC_LOAD_ERROR_MESSAGE;
}

/** `GET /t/{tenant_slug}/tenant/branding` — public; plain-text errors on 404. */
export async function fetchPublicBranding(
  tenantSlug: string,
): Promise<TenantBrandingApiResponse> {
  const url = `${envConfig.apiBaseUrl}/t/${encodeURIComponent(tenantSlug)}/tenant/branding`;
  const response = await fetch(url, { method: 'GET' });

  if (response.ok) {
    return (await response.json()) as TenantBrandingApiResponse;
  }

  const bodyText = await response.text();
  const message = await parseErrorMessage(response, bodyText);

  if (response.status === 404) {
    throw new PublicTenantUnavailableError(message);
  }

  throw new PublicBrandingApiError(message, response.status);
}
