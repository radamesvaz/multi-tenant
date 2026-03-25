import { defineStore } from 'pinia';
import { envConfig } from '../../core/config';
import { isJwtExpired, roleIdFromJwt } from '../../core/utils/jwt';
import { JWT_ROLE_ADMIN } from '../constants/jwtRoles';
import { ADMIN_TENANT_CONTEXT_KEY, tokenStorageKey } from '../constants/storageKeys';

type TenantTokenMap = Record<string, string>;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    tokensByTenant: {} as TenantTokenMap,
  }),
  actions: {
    /**
     * Active tenant used by `/admin/*` guards (the URL has no tenant slug).
     */
    getActiveAdminTenantSlug(): string {
      const fromStorage = localStorage.getItem(ADMIN_TENANT_CONTEXT_KEY);
      if (fromStorage && fromStorage.length > 0) return fromStorage;
      return envConfig.defaultTenantSlug;
    },
    setToken(tenantSlug: string, token: string) {
      this.tokensByTenant[tenantSlug] = token;
      localStorage.setItem(tokenStorageKey(tenantSlug), token);
      localStorage.setItem(ADMIN_TENANT_CONTEXT_KEY, tenantSlug);
    },
    clearToken(tenantSlug: string) {
      delete this.tokensByTenant[tenantSlug];
      localStorage.removeItem(tokenStorageKey(tenantSlug));
      if (localStorage.getItem(ADMIN_TENANT_CONTEXT_KEY) === tenantSlug) {
        localStorage.removeItem(ADMIN_TENANT_CONTEXT_KEY);
      }
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
      const token = this.getToken(tenantSlug);
      if (!token) return false;
      if (isJwtExpired(token)) {
        this.clearToken(tenantSlug);
        return false;
      }
      return true;
    },
    isAdminForTenant(tenantSlug: string) {
      const token = this.getToken(tenantSlug);
      if (!token) return false;
      if (isJwtExpired(token)) {
        this.clearToken(tenantSlug);
        return false;
      }
      return roleIdFromJwt(token) === JWT_ROLE_ADMIN;
    },
  },
});

