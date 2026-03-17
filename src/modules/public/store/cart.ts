import { defineStore } from 'pinia';
import type { Product } from '../../../core/models';

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
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
    addItem(product: Product, quantity = 1) {
      const existing = this.items.find((item) => item.product.id_product === product.id_product);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({ product, quantity });
      }
    },
    updateQuantity(productId: number, quantity: number) {
      const existing = this.items.find((item) => item.product.id_product === productId);
      if (!existing) return;

      if (quantity <= 0) {
        this.removeItem(productId);
      } else {
        existing.quantity = quantity;
      }
    },
    removeItem(productId: number) {
      this.items = this.items.filter((item) => item.product.id_product !== productId);
    },
    clearCart() {
      this.items = [];
    },
  },
});

