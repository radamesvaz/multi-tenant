import { defineStore } from 'pinia';
import type { Order } from '../../../core/models';

type OrdersState = {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  error: string | null;
};

export const useOrdersStore = defineStore('admin-orders', {
  state: (): OrdersState => ({
    orders: [],
    selectedOrder: null,
    isLoading: false,
    error: null,
  }),
  actions: {
    // Endpoints for authenticated orders will be wired here later.
  },
});

