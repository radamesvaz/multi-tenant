import { getMockTenantConfig } from '../mocks';

export type TenantUiConfig = {
  displayName: string;
  supportPhone?: string;
};

export const getTenantUiConfig = (tenantSlug: string): TenantUiConfig => {
  const tenant = getMockTenantConfig(tenantSlug);

  return {
    displayName: tenant.displayName,
    supportPhone: tenant.supportPhone ?? undefined,
  };
};

