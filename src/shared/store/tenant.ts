import { defineStore } from 'pinia';
import type { TenantBranding, TenantConfig } from '../../core/models';
import { getMockTenantConfig } from '../../core/mocks';
import { useCurrentTenant } from '../composables/useCurrentTenant';

type TenantState = {
  tenantSlug: string;
  tenantConfig: TenantConfig | null;
  branding: TenantBranding | null;
  isLoadingBranding: boolean;
  brandingError: string | null;
};

export const useTenantStore = defineStore('tenant', {
  state: (): TenantState => ({
    tenantSlug: '',
    tenantConfig: null,
    branding: null,
    isLoadingBranding: false,
    brandingError: null,
  }),
  actions: {
    setTenantSlug(slug: string) {
      this.tenantSlug = slug;
    },
    async loadPublicBranding() {
      const { tenantSlug } = useCurrentTenant();
      const slug = tenantSlug.value;

      this.tenantSlug = slug;
      this.isLoadingBranding = true;
      this.brandingError = null;

      try {
        const tenantConfig = getMockTenantConfig(slug);
        this.tenantConfig = tenantConfig;
        this.branding = tenantConfig.branding;
      } catch (error) {
        this.brandingError = (error as Error).message;
      } finally {
        this.isLoadingBranding = false;
      }
    },
  },
});

