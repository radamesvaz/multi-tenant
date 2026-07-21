import { envConfig } from '../config';
import type { TenantRegisterRequestBody, TenantRegisterResponse } from '../models';

export class TenantSignupApiError extends Error {
  readonly status: number;

  constructor(message: string, options: { status: number }) {
    super(message);
    this.name = 'TenantSignupApiError';
    this.status = options.status;
  }
}

function parseErrorMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'Error desconocido';

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      if (typeof parsed.message === 'string' && parsed.message.length > 0) {
        return parsed.message;
      }
      if (typeof parsed.error === 'string' && parsed.error.length > 0) {
        return parsed.error;
      }
    } catch {
      /* plain text fallback */
    }
  }

  return trimmed;
}

/**
 * `POST /public/tenant-register` — public; consumes one-time signup code and returns admin JWT.
 */
export async function postTenantRegister(
  body: TenantRegisterRequestBody,
): Promise<TenantRegisterResponse> {
  const url = `${envConfig.apiBaseUrl}/public/tenant-register`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return (await response.json()) as TenantRegisterResponse;
  }

  const text = await response.text();
  throw new TenantSignupApiError(parseErrorMessage(text), { status: response.status });
}
