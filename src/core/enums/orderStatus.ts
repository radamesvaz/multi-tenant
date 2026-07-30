import type { OrderPatchableStatus, OrderStatus } from '../models';

/** Values allowed in `PATCH /auth/orders/{id}` body `status` (server rejects others). */
export const PATCHABLE_ORDER_STATUSES: OrderPatchableStatus[] = [
  'preparing',
  'ready',
  'delivered',
  'cancelled',
  'deleted',
];

/** Spanish labels for admin UI (list, selects, etc.). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  preparing: 'En preparación',
  ready: 'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  deleted: 'Eliminada',
};

export function isPatchableOrderStatus(s: OrderStatus): s is OrderPatchableStatus {
  return PATCHABLE_ORDER_STATUSES.includes(s as OrderPatchableStatus);
}

/**
 * Linear kitchen FSM (audit locked decisions):
 * pending → preparing → ready → delivered
 * cancel only from pending | preparing | ready
 * deleted only from cancelled | expired | delivered
 */
export function getAllowedStatusTransitions(
  current: OrderStatus,
): OrderPatchableStatus[] {
  switch (current) {
    case 'pending':
      return ['preparing', 'cancelled'];
    case 'preparing':
      return ['ready', 'cancelled'];
    case 'ready':
      return ['delivered', 'cancelled'];
    case 'delivered':
      return ['deleted'];
    case 'cancelled':
    case 'expired':
      return ['deleted'];
    case 'deleted':
      return [];
    default:
      return [];
  }
}
