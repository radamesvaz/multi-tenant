import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { envConfig } from '../../core/config';

export function useCurrentTenant() {
  const route = useRoute();

  const tenantSlug = computed(() => {
    const param = route.params.tenantSlug;
    return typeof param === 'string' && param.length > 0
      ? param
      : envConfig.defaultTenantSlug;
  });

  const tokenStorageKey = computed(() => `token:${tenantSlug.value}`);

  return {
    tenantSlug,
    tokenStorageKey,
  };
}

