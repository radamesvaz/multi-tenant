import { defineStore } from 'pinia';
import type { Product } from '../../../core/models';
import { remainingPurchasableQuantity } from '../../../core/utils';

export type CartItem = {
  product: Product;
  quantity: number;
};

type PersistedCartState = {
  items: CartItem[];
  updatedAt: string;
  schemaVersion: number;
};

type CartState = {
  items: CartItem[];
  updatedAt: string | null;
  tenantSlug: string | null;
  isHydrated: boolean;
};

const CART_SCHEMA_VERSION = 2;

function getStorageKey(tenantSlug: string): string {
  return `cart:${tenantSlug}`;
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    updatedAt: null,
    tenantSlug: null,
    isHydrated: false,
  }),
  getters: {
    itemCount(state): number {
      return state.items.reduce((acc, item) => acc + item.quantity, 0);
    },
    totalPrice(state): number {
      return state.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    },
  },
  actions: {
    initializeForTenant(tenantSlug: string) {
      if (this.tenantSlug === tenantSlug && this.isHydrated) {
        return;
      }

      this.tenantSlug = tenantSlug;
      this.hydrateFromStorage();
    },
    hydrateFromStorage() {
      if (!this.tenantSlug || typeof window === 'undefined') {
        this.items = [];
        this.updatedAt = null;
        this.isHydrated = true;
        return;
      }

      try {
        const raw = window.localStorage.getItem(getStorageKey(this.tenantSlug));
        if (!raw) {
          this.items = [];
          this.updatedAt = null;
          this.isHydrated = true;
          return;
        }

        const parsed = JSON.parse(raw) as PersistedCartState;
        if (!parsed || parsed.schemaVersion !== CART_SCHEMA_VERSION || !Array.isArray(parsed.items)) {
          this.items = [];
          this.updatedAt = null;
          this.isHydrated = true;
          return;
        }

        this.items = parsed.items;
        this.updatedAt = parsed.updatedAt ?? null;
      } catch {
        this.items = [];
        this.updatedAt = null;
      } finally {
        this.isHydrated = true;
      }
    },
    persistToStorage() {
      if (!this.tenantSlug || typeof window === 'undefined') {
        return;
      }

      const payload: PersistedCartState = {
        items: this.items,
        updatedAt: this.updatedAt ?? new Date().toISOString(),
        schemaVersion: CART_SCHEMA_VERSION,
      };
      window.localStorage.setItem(getStorageKey(this.tenantSlug), JSON.stringify(payload));
    },
    touchUpdatedAt() {
      this.updatedAt = new Date().toISOString();
    },
    addItem(product: Product, quantity = 1) {
      if (quantity <= 0) return;

      const existing = this.items.find((item) => item.product.id_product === product.id_product);
      const currentQty = existing?.quantity ?? 0;
      const room = remainingPurchasableQuantity(product, currentQty);
      if (room <= 0) return;

      const toAdd = Number.isFinite(room) ? Math.min(quantity, room) : quantity;
      if (toAdd <= 0) return;

      if (existing) {
        existing.quantity += toAdd;
        existing.product = product;
      } else {
        this.items.push({ product, quantity: toAdd });
      }
      this.touchUpdatedAt();
      this.persistToStorage();
    },
    updateQuantity(productId: number, quantity: number) {
      const existing = this.items.find((item) => item.product.id_product === productId);
      if (!existing) return;

      if (quantity <= 0) {
        this.removeItem(productId);
        return;
      }

      const roomFromZero = remainingPurchasableQuantity(existing.product, 0);
      const next = Number.isFinite(roomFromZero)
        ? Math.min(quantity, roomFromZero)
        : quantity;
      if (next <= 0) {
        this.removeItem(productId);
        return;
      }

      existing.quantity = next;
      this.touchUpdatedAt();
      this.persistToStorage();
    },
    removeItem(productId: number) {
      this.items = this.items.filter((item) => item.product.id_product !== productId);
      this.touchUpdatedAt();
      this.persistToStorage();
    },
    clearCart() {
      this.items = [];
      this.touchUpdatedAt();
      this.persistToStorage();
    },
    replaceItems(nextItems: CartItem[]) {
      this.items = nextItems;
      this.touchUpdatedAt();
      this.persistToStorage();
    },
  },
});
