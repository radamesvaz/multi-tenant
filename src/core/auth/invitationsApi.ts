import { envConfig } from '../config';
import type {
  AcceptInvitationRequestBody,
  AcceptInvitationResponse,
  CreateInvitationRequestBody,
  InvitationMutationResponse,
  RevokeInvitationResponse,
} from '../models';
import { isSubscriptionCanceledResponse, SubscriptionCanceledError } from './subscriptionApi';

export class InvitationApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly retryAfter?: number;

  constructor(
    message: string,
    options: { status: number; errorCode?: string; retryAfter?: number },
  ) {
    super(message);
    this.name = 'InvitationApiError';
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.retryAfter = options.retryAfter;
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const n = parseInt(header, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseJsonErrorEnvelope(
  text: string,
): { message: string; errorCode?: string } {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    return { message: trimmed || 'Error desconocido' };
  }
  try {
    const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
    const message =
      typeof parsed.message === 'string' && parsed.message.length > 0
        ? parsed.message
        : typeof parsed.error === 'string' && parsed.error.length > 0
          ? parsed.error
          : trimmed || 'Error desconocido';
    return {
      message,
      errorCode: typeof parsed.error === 'string' ? parsed.error : undefined,
    };
  } catch {
    return { message: trimmed || 'Error desconocido' };
  }
}

async function parseAcceptErrorBody(
  response: Response,
): Promise<{ message: string; errorCode?: string }> {
  const contentType = response.headers.get('Content-Type') ?? '';
  const text = await response.text();

  if (contentType.includes('application/json') || text.trim().startsWith('{')) {
    return parseJsonErrorEnvelope(text);
  }

  if (response.status === 404) {
    return { message: 'La tienda no existe o no está activa.' };
  }

  return { message: text.trim() || `Error ${response.status}` };
}

function throwRateLimited(
  retryAfter: number | undefined,
  errorCode: string | undefined,
): never {
  throw new InvitationApiError(
    retryAfter != null
      ? `Demasiados intentos. Probá de nuevo en ${retryAfter} segundos.`
      : 'Demasiados intentos. Probá de nuevo más tarde.',
    { status: 429, errorCode: errorCode ?? 'too_many_requests', retryAfter },
  );
}

async function throwAdminInvitationError(response: Response): Promise<never> {
  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
  const bodyText = await response.text();

  if (isSubscriptionCanceledResponse(response.status, bodyText)) {
    const { redirectOnSubscriptionCanceled } = await import('./redirectOnSubscriptionCanceled');
    await redirectOnSubscriptionCanceled();
    throw new SubscriptionCanceledError(
      bodyText.trim() || 'La suscripción de la cuenta está cancelada.',
    );
  }

  const { message, errorCode } = parseJsonErrorEnvelope(bodyText);

  if (response.status === 429) {
    throwRateLimited(retryAfter, errorCode);
  }

  throw new InvitationApiError(message, {
    status: response.status,
    errorCode,
    retryAfter,
  });
}

async function postAdminInvitation<TResponse>(
  token: string,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  const url = `${envConfig.apiBaseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const init: RequestInit = { method: 'POST', headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  if (response.ok) {
    return (await response.json()) as TResponse;
  }

  return throwAdminInvitationError(response);
}

export function postCreateInvitation(
  token: string,
  body: CreateInvitationRequestBody,
): Promise<InvitationMutationResponse> {
  return postAdminInvitation<InvitationMutationResponse>(token, '/auth/invitations', body);
}

export function postResendInvitation(
  token: string,
  invitationId: number,
): Promise<InvitationMutationResponse> {
  return postAdminInvitation<InvitationMutationResponse>(
    token,
    `/auth/invitations/${invitationId}/resend`,
  );
}

export function postRevokeInvitation(
  token: string,
  invitationId: number,
): Promise<RevokeInvitationResponse> {
  return postAdminInvitation<RevokeInvitationResponse>(
    token,
    `/auth/invitations/${invitationId}/revoke`,
  );
}

export async function postAcceptInvitation(
  tenantSlug: string,
  body: AcceptInvitationRequestBody,
): Promise<AcceptInvitationResponse> {
  const url = `${envConfig.apiBaseUrl}/t/${encodeURIComponent(tenantSlug)}/auth/invitations/accept`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return (await response.json()) as AcceptInvitationResponse;
  }

  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
  const { message, errorCode } = await parseAcceptErrorBody(response);

  if (response.status === 429) {
    throwRateLimited(retryAfter, errorCode);
  }

  throw new InvitationApiError(message, {
    status: response.status,
    errorCode,
    retryAfter,
  });
}
