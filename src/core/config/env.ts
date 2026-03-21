const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const appName = import.meta.env.VITE_APP_NAME ?? 'Multi Tenant Frontend';
const defaultTenantSlug = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'default';
const enableDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true';
const whatsappEnabled = import.meta.env.VITE_WHATSAPP_ENABLED !== 'false';
const whatsappPhoneNumber = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER ?? '';

if (!apiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL environment variable.');
}

export const envConfig = {
  apiBaseUrl,
  appName,
  defaultTenantSlug,
  enableDebug,
  whatsapp: {
    enabled: whatsappEnabled,
    phoneNumber: whatsappPhoneNumber,
  },
};

