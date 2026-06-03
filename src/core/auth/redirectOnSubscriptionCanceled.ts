import { router } from '../../app/router';
import { useAuthStore, useSubscriptionStore } from '../../shared/store';

/** After 403 canceled on Bearer `/auth/*` routes: mark canceled, clear session, redirect. */
export async function redirectOnSubscriptionCanceled(tenantSlug?: string): Promise<void> {
  const auth = useAuthStore();
  const subscription = useSubscriptionStore();
  const slug = tenantSlug ?? auth.getActiveAdminTenantSlug();

  subscription.markCanceled();
  auth.clearToken(slug);

  if (router.currentRoute.value.name === 'admin-subscription-canceled') {
    return;
  }

  await router.replace({
    name: 'admin-subscription-canceled',
    query: { tenantSlug: slug },
  });
}
