import { defineStore } from 'pinia';
import type { Order, UpdateAuthOrderPayload } from '../../../core/models';
import { orderService } from '../../../core/services';
import { useAuthStore } from '../../../shared/store';

const ADMIN_ORDER_PAGE_SIZE = 20;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

let listSessionAbort: AbortController | null = null;

function newListSessionSignal(): AbortSignal {
  listSessionAbort?.abort();
  listSessionAbort = new AbortController();
  return listSessionAbort.signal;
}

type OrdersState = {
  orders: Order[];
  selectedOrder: Order | null;
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
};

export const useOrdersStore = defineStore('admin-orders', {
  state: (): OrdersState => ({
    orders: [],
    selectedOrder: null,
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
  }),
  getters: {
    hasMore(state): boolean {
      return state.nextCursor != null;
    },
  },
  actions: {
    getAuthContext() {
      const authStore = useAuthStore();
      const tenantSlug = authStore.getActiveAdminTenantSlug();
      const token = authStore.getToken(tenantSlug);
      if (!token) {
        throw new Error('Sesión no válida. Volvé a iniciar sesión.');
      }
      return { token, tenantSlug };
    },

    async loadOrders() {
      await this.loadFirstPage();
    },

    async loadFirstPage() {
      this.isLoading = true;
      this.isLoadingMore = false;
      this.error = null;

      try {
        const { token } = this.getAuthContext();
        const signal = newListSessionSignal();
        const { items, next_cursor } = await orderService.listAuthOrders(token, {
          limit: ADMIN_ORDER_PAGE_SIZE,
          signal,
        });
        this.orders = items;
        this.nextCursor = next_cursor;
      } catch (error) {
        if (isAbortError(error)) return;
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        this.orders = [];
        this.nextCursor = null;
      } finally {
        this.isLoading = false;
      }
    },

    async loadMore() {
      if (this.nextCursor == null || this.isLoadingMore || this.isLoading) return;

      const signal = listSessionAbort?.signal;
      if (!signal) return;

      this.isLoadingMore = true;
      this.error = null;

      try {
        const { token } = this.getAuthContext();
        const { items, next_cursor } = await orderService.listAuthOrders(token, {
          limit: ADMIN_ORDER_PAGE_SIZE,
          cursor: this.nextCursor,
          signal,
        });
        this.orders = [...this.orders, ...items];
        this.nextCursor = next_cursor;
      } catch (error) {
        if (isAbortError(error)) return;
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
      } finally {
        this.isLoadingMore = false;
      }
    },

    async refreshOrder(id_order: number): Promise<Order> {
      const { token } = this.getAuthContext();
      const refreshed = await orderService.getAuthOrderById(token, id_order);
      this.orders = this.orders.map((o) => (o.id_order === id_order ? refreshed : o));
      if (this.selectedOrder?.id_order === id_order) {
        this.selectedOrder = refreshed;
      }
      return refreshed;
    },

    async updateOrder(id_order: number, patch: UpdateAuthOrderPayload): Promise<Order> {
      this.error = null;

      try {
        const { token } = this.getAuthContext();
        const updated = await orderService.updateAuthOrder(token, id_order, patch);
        this.orders = this.orders.map((o) => (o.id_order === id_order ? updated : o));
        if (this.selectedOrder?.id_order === id_order) {
          this.selectedOrder = updated;
        }
        return updated;
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        throw error;
      }
    },
  },
});
