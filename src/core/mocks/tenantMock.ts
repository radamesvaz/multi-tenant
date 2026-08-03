import { EMPTY_TENANT_BRANDING, type TenantConfig } from '../models';

/**
 * Logo specifications for tenants — see `core/constants/logoSpec.ts`.
 *
 * Quick reference:
 * - Fixed display slots (any aspect ratio): 200×48 desktop, 140×44 mobile, 160×48 admin
 * - Upload hints: horizontal 400×96, square/circular 160×160, vertical 120×160
 * - Format: SVG preferred, PNG with transparency
 */

const createTenantConfig = (config: TenantConfig): TenantConfig => config;

export const mockTenantConfigs: Record<string, TenantConfig> = {
  default: createTenantConfig({
    slug: 'default',
    displayName: 'Confettideli',
    supportPhone: '+34 600 000 000',
    whatsapp: '+34600000000',
    planCode: 'basic',
    subscriptionStatus: 'active',
    isActive: true,
    branding: { ...EMPTY_TENANT_BRANDING },
  }),
  'mi-panaderia': createTenantConfig({
    slug: 'mi-panaderia',
    displayName: 'Mi Panadería',
    supportPhone: '+34 611 111 111',
    whatsapp: '+34611111111',
    planCode: 'pro',
    subscriptionStatus: 'trialing',
    isActive: true,
    branding: { ...EMPTY_TENANT_BRANDING },
  }),
};

export const getMockTenantConfig = (tenantSlug: string): TenantConfig => {
  return (
    mockTenantConfigs[tenantSlug] ?? {
      slug: tenantSlug,
      displayName: tenantSlug,
      supportPhone: null,
      whatsapp: null,
      planCode: 'basic',
      subscriptionStatus: 'active',
      isActive: true,
      branding: { ...EMPTY_TENANT_BRANDING },
    }
  );
};

