export const ADMIN_TENANT_CONTEXT_KEY = 'adminTenantSlug';

export const tokenStorageKey = (tenantSlug: string) => `token:${tenantSlug}`;

/** Last invitation sent from admin panel (no GET list — used for resend/revoke in MVP). */
export const lastInvitationStorageKey = (tenantSlug: string) => `lastInvitation:${tenantSlug}`;
