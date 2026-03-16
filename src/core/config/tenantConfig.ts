export type TenantUiConfig = {
  displayName: string;
  supportPhone?: string;
};

const tenantUiConfigMap: Record<string, TenantUiConfig> = {
  default: {
    displayName: 'Default Tenant',
  },
};

export const getTenantUiConfig = (tenantSlug: string): TenantUiConfig => {
  return (
    tenantUiConfigMap[tenantSlug] ?? {
      displayName: tenantSlug,
    }
  );
};

