import { defineStore } from 'pinia';
import type { Product } from '../../../core/models';
import { productService } from '../../../core/services';

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

      try {
        // TODO: replace with authenticated /auth/products endpoint when available
        this.products = await productService.getPublicProducts();
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.isLoading = false;
      }
    },
  },
});

