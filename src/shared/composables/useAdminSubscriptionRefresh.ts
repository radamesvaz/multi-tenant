import { onMounted, onUnmounted } from 'vue';
import { useAuthStore, useSubscriptionStore } from '../store';

/** Refreshes `days_until_cancel` when the tab becomes visible during long sessions. */
export function useAdminSubscriptionRefresh() {
  const authStore = useAuthStore();
  const subscriptionStore = useSubscriptionStore();

  function onVisibilityChange() {
    if (document.visibilityState !== 'visible') {
      return;
    }
    const slug = authStore.getActiveAdminTenantSlug();
    const token = authStore.getToken(slug);
    if (!token || !authStore.isAdminForTenant(slug)) {
      return;
    }
    void subscriptionStore.refreshFromToken(token);
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
}
