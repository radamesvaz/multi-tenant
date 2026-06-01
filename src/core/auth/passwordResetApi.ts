import { envConfig } from '../config';
import type {
  ForgotPasswordRequestBody,
  ForgotPasswordResponse,
  ResetPasswordRequestBody,
  ResetPasswordResponse,
} from '../models';

export class PasswordResetApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly retryAfter?: number;

  constructor(
    message: string,
    options: { status: number; errorCode?: string; retryAfter?: number },
  ) {
    super(message);
    this.name = 'PasswordResetApiError';
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.retryAfter = options.retryAfter;
  }
}

export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  'Si la cuenta existe, enviaremos instrucciones para restablecer la contraseña.';

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const n = parseInt(header, 10);
  return Number.isFinite(n) ? n : undefined;
}

async function parseErrorBody(
  response: Response,
): Promise<{ message: string; errorCode?: string }> {
  const contentType = response.headers.get('Content-Type') ?? '';
  const text = await response.text();

  if (contentType.includes('application/json') || text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      const message =
        typeof parsed.message === 'string' && parsed.message.length > 0
          ? parsed.message
          : typeof parsed.error === 'string' && parsed.error.length > 0
            ? parsed.error
            : text.trim() || `Error ${response.status}`;
      return {
        message,
        errorCode: typeof parsed.error === 'string' ? parsed.error : undefined,
      };
    } catch {
      /* use plain text below */
    }
  }

  if (response.status === 404) {
    return { message: 'La tienda no existe o no está activa.' };
  }

  return { message: text.trim() || `Error ${response.status}` };
}

async function postPasswordResetAction<TResponse>(
  tenantSlug: string,
  action: 'forgot' | 'reset',
  body: unknown,
): Promise<TResponse> {
  const url = `${envConfig.apiBaseUrl}/t/${encodeURIComponent(tenantSlug)}/auth/password/${action}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return (await response.json()) as TResponse;
  }

  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
  const { message, errorCode } = await parseErrorBody(response);

  if (response.status === 429) {
    throw new PasswordResetApiError(
      retryAfter != null
        ? `Demasiados intentos. Probá de nuevo en ${retryAfter} segundos.`
        : 'Demasiados intentos. Probá de nuevo más tarde.',
      { status: 429, errorCode: errorCode ?? 'too_many_requests', retryAfter },
    );
  }

  throw new PasswordResetApiError(message, {
    status: response.status,
    errorCode,
    retryAfter,
  });
}

export function postPasswordForgot(
  tenantSlug: string,
  body: ForgotPasswordRequestBody,
): Promise<ForgotPasswordResponse> {
  return postPasswordResetAction<ForgotPasswordResponse>(tenantSlug, 'forgot', body);
}

export function postPasswordReset(
  tenantSlug: string,
  body: ResetPasswordRequestBody,
): Promise<ResetPasswordResponse> {
  return postPasswordResetAction<ResetPasswordResponse>(tenantSlug, 'reset', body);
}
