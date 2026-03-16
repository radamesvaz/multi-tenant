const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const appName = import.meta.env.VITE_APP_NAME ?? 'Multi Tenant Frontend';
const defaultTenantSlug = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'default';
const enableDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true';

if (!apiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL environment variable.');
}

export const envConfig = {
  apiBaseUrl,
  appName,
  defaultTenantSlug,
  enableDebug,
};

