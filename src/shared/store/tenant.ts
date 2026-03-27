import { defineStore } from 'pinia';
import { EMPTY_TENANT_BRANDING, type TenantBranding, type TenantConfig } from '../../core/models';
import { getMockTenantConfig } from '../../core/mocks';
import { tenantService } from '../../core/services';
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
    /**
     * Carga branding desde `GET /t/{slug}/tenant/branding`. Los mocks solo aportan metadatos
     * (nombre comercial, etc.); colores y logo vienen siempre de la API.
     */
    async loadBrandingForSlug(slug: string) {
      this.tenantSlug = slug;
      this.isLoadingBranding = true;
      this.brandingError = null;

      const base = getMockTenantConfig(slug);

      try {
        const branding = await tenantService.getPublicBranding(slug);
        this.tenantConfig = { ...base, branding };
        this.branding = branding;
      } catch (error) {
        this.brandingError = (error as Error).message;
        this.tenantConfig = { ...base, branding: EMPTY_TENANT_BRANDING };
        this.branding = EMPTY_TENANT_BRANDING;
      } finally {
        this.isLoadingBranding = false;
      }
    },

    /** Uses the tenant slug from the current public route (`/t/:tenantSlug/...`). */
    async loadPublicBranding() {
      const { tenantSlug } = useCurrentTenant();
      await this.loadBrandingForSlug(tenantSlug.value);
    },
  },
});

