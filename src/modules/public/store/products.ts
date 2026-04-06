import { defineStore } from 'pinia';
import type { Product } from '../../../core/models';
import { productService } from '../../../core/services';

export const PUBLIC_PRODUCT_PAGE_SIZE = 20;

type PublicProductsState = {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  /** `q` sent on the first page of the current listing (trimmed, empty = no name filter). */
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

export const usePublicProductsStore = defineStore('public-products', {
  state: (): PublicProductsState => ({
    products: [],
    selectedProduct: null,
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
    async loadFirstPage(tenantSlug: string, searchInput = '') {
      const q = effectiveQ(searchInput);
      this.listQuery = q;
      const signal = newListSessionSignal();

      this.isLoading = true;
      this.isLoadingMore = false;
      this.error = null;

      try {
        const { items, next_cursor } = await productService.listTenantProducts(tenantSlug, {
          limit: PUBLIC_PRODUCT_PAGE_SIZE,
          q: q || undefined,
          signal,
        });
        this.products = items;
        this.nextCursor = next_cursor;
      } catch (error) {
        if (isAbortError(error)) return;
        this.error = (error as Error).message;
        this.products = [];
        this.nextCursor = null;
      } finally {
        this.isLoading = false;
      }
    },

    async loadMore(tenantSlug: string) {
      if (this.nextCursor == null || this.isLoadingMore || this.isLoading) return;

      const signal = listSessionAbort?.signal;
      if (!signal) return;

      this.isLoadingMore = true;
      this.error = null;

      try {
        const { items, next_cursor } = await productService.listTenantProducts(tenantSlug, {
          limit: PUBLIC_PRODUCT_PAGE_SIZE,
          cursor: this.nextCursor,
          q: this.listQuery || undefined,
          signal,
        });
        this.products = [...this.products, ...items];
        this.nextCursor = next_cursor;
      } catch (error) {
        if (isAbortError(error)) return;
        this.error = (error as Error).message;
      } finally {
        this.isLoadingMore = false;
      }
    },

    /** @deprecated Use `loadFirstPage` */
    async loadProducts(tenantSlug: string) {
      await this.loadFirstPage(tenantSlug, '');
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
