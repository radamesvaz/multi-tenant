import type { TenantConfig } from '../models';

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
    branding: {
      logo_url: '/mock/tenants/default/logo.svg',
      logo_width: 180,
      logo_height: 56,
      primary_color: '#D97706',
      secondary_color: '#F59E0B',
      accent_color: '#92400E',
    },
  }),
  'mi-panaderia': createTenantConfig({
    slug: 'mi-panaderia',
    displayName: 'Mi Panadería',
    supportPhone: '+34 611 111 111',
    whatsapp: '+34611111111',
    planCode: 'pro',
    subscriptionStatus: 'trialing',
    isActive: true,
    branding: {
      logo_url: '/mock/tenants/mi-panaderia/logo.svg',
      logo_width: 170,
      logo_height: 52,
      primary_color: '#7C3AED',
      secondary_color: '#A78BFA',
      accent_color: '#4C1D95',
    },
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
      branding: {
        logo_url: null,
        logo_width: null,
        logo_height: null,
        primary_color: '#D97706',
        secondary_color: '#F59E0B',
        accent_color: '#92400E',
      },
    }
  );
};

