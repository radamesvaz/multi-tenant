<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { envConfig, getTenantUiConfig } from '../../../core/config';
import './AdminSubscriptionCanceledPage.css';

const route = useRoute();

const tenantSlug = computed(() => {
  const fromQuery = route.query.tenantSlug;
  if (typeof fromQuery === 'string' && fromQuery.trim().length > 0) {
    return fromQuery.trim();
  }
  return envConfig.defaultTenantSlug;
});

const tenantUiConfig = computed(() => getTenantUiConfig(tenantSlug.value));

const supportPhone = computed(() => tenantUiConfig.value.supportPhone ?? null);
</script>

<template>
  <main class="admin-subscription-canceled">
    <div class="admin-subscription-canceled__card">
      <h1>Cuenta cancelada</h1>
      <p>
        La suscripción de esta tienda fue cancelada. El panel de administración no está
        disponible hasta que se reactive la cuenta.
      </p>
      <p>Contactá a soporte si creés que se trata de un error.</p>
      <p v-if="supportPhone" class="admin-subscription-canceled__support">
        Soporte: {{ supportPhone }}
      </p>
      <RouterLink
        class="admin-subscription-canceled__link"
        :to="{ name: 'public-home', params: { tenantSlug } }"
      >
        Volver a la tienda
      </RouterLink>
    </div>
  </main>
</template>
