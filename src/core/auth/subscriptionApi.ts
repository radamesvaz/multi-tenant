import { envConfig } from '../config';
import type { SubscriptionResponse } from '../models';

export class SubscriptionCanceledError extends Error {
  readonly status = 403;

  constructor(message = 'La suscripción de la cuenta está cancelada.') {
    super(message);
    this.name = 'SubscriptionCanceledError';
  }
}

export class SubscriptionApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SubscriptionApiError';
    this.status = status;
  }
}

/** Backend plain-text bodies for canceled tenant (middleware, login, GET subscription). */
export function isSubscriptionCanceledResponse(status: number, bodyText: string): boolean {
  return status === 403 && bodyText.toLowerCase().includes('subscription is canceled');
}

/** Call only on login / bootstrap / optional refresh — not on every business request. */
export async function fetchSubscriptionContext(token: string): Promise<SubscriptionResponse> {
  const url = `${envConfig.apiBaseUrl}/auth/subscription`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const bodyText = await response.text();

  if (response.ok) {
    return JSON.parse(bodyText) as SubscriptionResponse;
  }

  if (isSubscriptionCanceledResponse(response.status, bodyText)) {
    throw new SubscriptionCanceledError(
      bodyText.trim() || 'La suscripción de la cuenta está cancelada.',
    );
  }

  throw new SubscriptionApiError(
    bodyText.trim() || `Error ${response.status}`,
    response.status,
  );
}
