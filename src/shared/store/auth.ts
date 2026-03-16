import { defineStore } from 'pinia';

type TenantTokenMap = Record<string, string>;

const tokenStorageKey = (tenantSlug: string) => `token:${tenantSlug}`;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    tokensByTenant: {} as TenantTokenMap,
  }),
  actions: {
    setToken(tenantSlug: string, token: string) {
      this.tokensByTenant[tenantSlug] = token;
      localStorage.setItem(tokenStorageKey(tenantSlug), token);
    },
    clearToken(tenantSlug: string) {
      delete this.tokensByTenant[tenantSlug];
      localStorage.removeItem(tokenStorageKey(tenantSlug));
    },
    getToken(tenantSlug: string) {
      const inMemoryToken = this.tokensByTenant[tenantSlug];
      if (inMemoryToken) return inMemoryToken;

      const persistedToken = localStorage.getItem(tokenStorageKey(tenantSlug));
      if (persistedToken) {
        this.tokensByTenant[tenantSlug] = persistedToken;
      }
      return persistedToken;
    },
    isAuthenticatedForTenant(tenantSlug: string) {
      return Boolean(this.getToken(tenantSlug));
    },
  },
});

