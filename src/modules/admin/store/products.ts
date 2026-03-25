import { defineStore } from 'pinia';
import type { Product } from '../../../core/models';
import { productService } from '../../../core/services';
import { useAuthStore } from '../../../shared/store';

type AdminProductsState = {
  products: Product[];
  isLoading: boolean;
  error: string | null;
};

export const useAdminProductsStore = defineStore('admin-products', {
  state: (): AdminProductsState => ({
    products: [],
    isLoading: false,
    error: null,
  }),
  actions: {
    async loadProducts() {
      this.isLoading = true;
      this.error = null;

      const authStore = useAuthStore();
      const tenantSlug = authStore.getActiveAdminTenantSlug();
      const token = authStore.getToken(tenantSlug);

      try {
        this.products = await productService.listTenantProducts(tenantSlug, { token });
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
      } finally {
        this.isLoading = false;
      }
    },
  },
});

