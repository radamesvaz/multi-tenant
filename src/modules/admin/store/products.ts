import { defineStore } from 'pinia';
import type { Product, UpdateProductDetailsPayload } from '../../../core/models';
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
    getAuthContext() {
      const authStore = useAuthStore();
      const tenantSlug = authStore.getActiveAdminTenantSlug();
      const token = authStore.getToken(tenantSlug);
      if (!token) {
        throw new Error('Sesión no válida. Volvé a iniciar sesión.');
      }
      return { tenantSlug, token };
    },

    async refreshProductById(id: number) {
      const { tenantSlug, token } = this.getAuthContext();
      const refreshed = await productService.getTenantProductById(tenantSlug, id, { token });
      this.products = this.products.map((p) => (p.id_product === id ? refreshed : p));
      return refreshed;
    },

    async loadProducts() {
      this.isLoading = true;
      this.error = null;

      try {
        const { tenantSlug, token } = this.getAuthContext();
        this.products = await productService.listTenantProducts(tenantSlug, { token });
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
      } finally {
        this.isLoading = false;
      }
    },

    async updateProductDetails(id: number, payload: UpdateProductDetailsPayload) {
      this.error = null;
      try {
        const { token } = this.getAuthContext();
        await productService.updateAuthProductDetails(token, id, payload);
        return this.refreshProductById(id);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        throw error;
      }
    },

    async setProductThumbnailFromUrl(id: number, thumbnailUrl: string) {
      this.error = null;
      try {
        const { token } = this.getAuthContext();
        await productService.setAuthProductThumbnail(token, id, thumbnailUrl);
        return this.refreshProductById(id);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        throw error;
      }
    },

    async uploadProductThumbnail(id: number, file: File) {
      this.error = null;
      try {
        const { token } = this.getAuthContext();
        await productService.uploadAuthProductThumbnail(token, id, file);
        return this.refreshProductById(id);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        throw error;
      }
    },

    async addProductImages(id: number, files: File[]) {
      this.error = null;
      try {
        const { token } = this.getAuthContext();
        await productService.addAuthProductImages(token, id, files);
        return this.refreshProductById(id);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        throw error;
      }
    },

    async deleteProductImage(id: number, imageUrl: string) {
      this.error = null;
      try {
        const { token } = this.getAuthContext();
        await productService.deleteAuthProductImage(token, id, imageUrl);
        return this.refreshProductById(id);
      } catch (error) {
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        throw error;
      }
    },
  },
});

