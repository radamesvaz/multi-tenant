import { router } from '../../app/router';
import { useAuthStore, useSubscriptionStore } from '../../shared/store';

/** After 401 on Bearer-protected routes: clear session and redirect to login. */
export async function redirectOnUnauthorizedApi(): Promise<void> {
  const auth = useAuthStore();
  const subscription = useSubscriptionStore();
  const slug = auth.getActiveAdminTenantSlug();
  auth.clearToken(slug);
  subscription.clearSubscription();

  if (router.currentRoute.value.name === 'admin-login') {
    return;
  }

  await router.replace({
    name: 'admin-login',
    params: { tenantSlug: slug },
    query: { redirect: router.currentRoute.value.fullPath },
  });
}
