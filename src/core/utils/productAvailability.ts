import type { Product } from '../models';

/** Product can be added to cart / purchased under current catalog rules. */
export function isPurchasable(p: Product): boolean {
  if (p.status !== 'active') return false;
  if (!p.track_inventory) return true;
  return p.stock > 0;
}

/** Active product that tracks stock and has none left (still listed on storefront). */
export function isSoldOut(p: Product): boolean {
  return p.status === 'active' && p.track_inventory && p.stock === 0;
}

/**
 * How many more units can be added given current cart quantity.
 * Unlimited when inventory is not tracked.
 */
export function remainingPurchasableQuantity(p: Product, currentQuantity: number): number {
  if (p.status !== 'active') return 0;
  if (!p.track_inventory) return Number.POSITIVE_INFINITY;
  return Math.max(0, p.stock - currentQuantity);
}
