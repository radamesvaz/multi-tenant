import { defineStore } from 'pinia';
import { PublicTenantUnavailableError } from '../../core/auth/publicBrandingApi';
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
  /** `true` when public branding API returns 404 (tenant inactive / canceled). */
  brandingUnavailable: boolean;
  /** `true` when branding failed for reasons other than 404 (e.g. network). */
  brandingLoadFailed: boolean;
};

export const useTenantStore = defineStore('tenant', {
  state: (): TenantState => ({
    tenantSlug: '',
    tenantConfig: null,
    branding: null,
    isLoadingBranding: false,
    brandingError: null,
    brandingUnavailable: false,
    brandingLoadFailed: false,
  }),
  actions: {
    setTenantSlug(slug: string) {
      this.tenantSlug = slug;
    },
    /**
     * Loads branding from `GET /t/{slug}/tenant/branding`. Mocks only supply metadata;
     * colors and logo always come from the API.
     */
    async loadBrandingForSlug(slug: string) {
      this.tenantSlug = slug;
      this.isLoadingBranding = true;
      this.brandingError = null;
      this.brandingUnavailable = false;
      this.brandingLoadFailed = false;

      const base = getMockTenantConfig(slug);

      try {
        const branding = await tenantService.getPublicBranding(slug);
        this.tenantConfig = { ...base, branding };
        this.branding = branding;
      } catch (error) {
        if (error instanceof PublicTenantUnavailableError) {
          this.brandingUnavailable = true;
          this.brandingError = error.message;
        } else {
          this.brandingLoadFailed = true;
          this.brandingError =
            error instanceof Error ? error.message : 'No se pudo cargar la tienda.';
        }
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
