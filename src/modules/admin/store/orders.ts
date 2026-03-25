import { defineStore } from 'pinia';
import type { Order } from '../../../core/models';
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
  },
});

