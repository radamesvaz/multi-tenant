import type { SubscriptionContext } from '../models';

export function formatSubscriptionGraceEnd(iso: string | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** User-visible copy for the pending-payment ribbon (locale es-ES). */
export function formatPendingPaymentMessage(subscription: SubscriptionContext): string {
  const days = subscription.days_until_cancel;
  const graceEnd = formatSubscriptionGraceEnd(subscription.grace_period_end);

  if (days != null && days >= 0) {
    const dayWord = days === 1 ? 'día' : 'días';
    if (graceEnd) {
      return `Pago pendiente. Tenés ${days} ${dayWord} para regularizar antes del ${graceEnd}.`;
    }
    return `Pago pendiente. Tenés ${days} ${dayWord} antes de que se cancele la cuenta.`;
  }

  if (graceEnd) {
    return `Pago pendiente. Regularizá antes del ${graceEnd} para evitar la cancelación.`;
  }

  return 'Pago pendiente. Regularizá tu suscripción para evitar la cancelación de la cuenta.';
}
