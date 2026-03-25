import { defineStore } from 'pinia';
import type { Order, UpdateAuthOrderPayload } from '../../../core/models';
import { orderService } from '../../../core/services';
import { useAuthStore } from '../../../shared/store';

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
    async loadOrders() {
      this.isLoading = true;
      this.error = null;

      const authStore = useAuthStore();
      const tenantSlug = authStore.getActiveAdminTenantSlug();
      const token = authStore.getToken(tenantSlug);

      try {
        if (!token) {
          throw new Error('Sesión no válida. Volvé a iniciar sesión.');
        }
        this.orders = await orderService.listAuthOrders(token);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
      } finally {
        this.isLoading = false;
      }
    },

    async updateOrder(id_order: number, patch: UpdateAuthOrderPayload): Promise<Order> {
      this.error = null;

      const authStore = useAuthStore();
      const tenantSlug = authStore.getActiveAdminTenantSlug();
      const token = authStore.getToken(tenantSlug);

      if (!token) {
        throw new Error('Sesión no válida. Volvé a iniciar sesión.');
      }

      try {
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

