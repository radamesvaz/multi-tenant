import { defineStore } from 'pinia';
import type { Product } from '../../../core/models';
import { productService } from '../../../core/services';

type PublicProductsState = {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;
};

export const usePublicProductsStore = defineStore('public-products', {
  state: (): PublicProductsState => ({
    products: [],
    selectedProduct: null,
    isLoading: false,
    error: null,
  }),
  actions: {
    async loadProducts(tenantSlug: string) {
      this.isLoading = true;
      this.error = null;

      try {
        this.products = await productService.getPublicProducts(tenantSlug);
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.isLoading = false;
      }
    },
    async loadProductById(tenantSlug: string, id: number) {
      this.isLoading = true;
      this.error = null;

      try {
        this.selectedProduct = await productService.getProductById(tenantSlug, id);
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.isLoading = false;
      }
    },
  },
});

