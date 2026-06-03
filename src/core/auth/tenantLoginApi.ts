import { envConfig } from '../config';
import type { AuthTokenResponse, LoginRequestBody } from '../models';
import { isSubscriptionCanceledResponse, SubscriptionCanceledError } from './subscriptionApi';

export class TenantLoginApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TenantLoginApiError';
    this.status = status;
  }
}

/** Shown on login when the tenant subscription is canceled (distinct from invalid credentials). */
export const LOGIN_SUBSCRIPTION_CANCELED_MESSAGE =
  'La suscripción de esta tienda fue cancelada. El panel de administración no está disponible.';

const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos.';

export async function postTenantLogin(
  tenantSlug: string,
  body: LoginRequestBody,
): Promise<AuthTokenResponse> {
  const url = `${envConfig.apiBaseUrl}/t/${encodeURIComponent(tenantSlug)}/auth/login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return (await response.json()) as AuthTokenResponse;
  }

  const bodyText = await response.text();

  if (isSubscriptionCanceledResponse(response.status, bodyText)) {
    throw new SubscriptionCanceledError(LOGIN_SUBSCRIPTION_CANCELED_MESSAGE);
  }

  if (response.status === 401) {
    throw new TenantLoginApiError(INVALID_CREDENTIALS_MESSAGE, 401);
  }

  const message = bodyText.trim() || `Error ${response.status}`;
  throw new TenantLoginApiError(message, response.status);
}
