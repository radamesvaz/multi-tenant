<script setup lang="ts">
import { computed } from 'vue';
import { RouterView } from 'vue-router';
import { getTenantUiConfig } from '../../../core/config';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';

const { tenantSlug } = useCurrentTenant();
const tenantUiConfig = computed(() => getTenantUiConfig(tenantSlug.value));
</script>

<template>
  <div class="public-layout">
    <header class="public-layout__header">
      <h1>{{ tenantUiConfig.displayName }} storefront</h1>
      <small>Tenant: {{ tenantSlug }}</small>
    </header>

    <main class="public-layout__content">
      <RouterView />
    </main>

    <footer class="public-layout__footer">
      <small>Public storefront layout</small>
    </footer>
  </div>
</template>

