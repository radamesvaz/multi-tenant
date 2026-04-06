import { defineStore } from 'pinia';
import type { Product, UpdateProductDetailsPayload } from '../../../core/models';
import { productService } from '../../../core/services';
import { useAuthStore } from '../../../shared/store';

const ADMIN_PRODUCT_PAGE_SIZE = 20;

type AdminProductsState = {
  products: Product[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  listQuery: string;
};

let listSessionAbort: AbortController | null = null;

function newListSessionSignal(): AbortSignal {
  listSessionAbort?.abort();
  listSessionAbort = new AbortController();
  return listSessionAbort.signal;
}

function effectiveQ(raw: string): string {
  const t = raw.trim();
  return t.length >= 2 ? t : '';
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

export const useAdminProductsStore = defineStore('admin-products', {
  state: (): AdminProductsState => ({
    products: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    nextCursor: null,
    listQuery: '',
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
      return { tenantSlug, token };
    },

    async refreshProductById(id: number) {
      const { tenantSlug, token } = this.getAuthContext();
      const refreshed = await productService.getTenantProductById(tenantSlug, id, { token });
      this.products = this.products.map((p) => (p.id_product === id ? refreshed : p));
      return refreshed;
    },

    async loadFirstPage(searchInput = '') {
      this.isLoading = true;
      this.isLoadingMore = false;
      this.error = null;

      try {
        const { tenantSlug, token } = this.getAuthContext();
        const q = effectiveQ(searchInput);
        this.listQuery = q;
        const signal = newListSessionSignal();

        const { items, next_cursor } = await productService.listTenantProducts(tenantSlug, {
          token,
          limit: ADMIN_PRODUCT_PAGE_SIZE,
          q: q || undefined,
          signal,
        });
        this.products = items;
        this.nextCursor = next_cursor;
      } catch (error) {
        if (isAbortError(error)) return;
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
        this.products = [];
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
        const { tenantSlug, token } = this.getAuthContext();
        const { items, next_cursor } = await productService.listTenantProducts(tenantSlug, {
          token,
          limit: ADMIN_PRODUCT_PAGE_SIZE,
          cursor: this.nextCursor,
          q: this.listQuery || undefined,
          signal,
        });
        this.products = [...this.products, ...items];
        this.nextCursor = next_cursor;
      } catch (error) {
        if (isAbortError(error)) return;
        const code = (error as Error & { code?: string }).code;
        this.error = code === 'SESSION_EXPIRED' ? null : (error as Error).message;
      } finally {
        this.isLoadingMore = false;
      }
    },

    /** @deprecated Use `loadFirstPage` */
    async loadProducts() {
      await this.loadFirstPage('');
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
