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

const adminLoginTo = computed(() => ({
  name: 'admin-login' as const,
  params: { tenantSlug: tenantSlug.value },
}));
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
      <p class="admin-subscription-canceled__hint">
        Cuando la cuenta se reactive, podés iniciar sesión de nuevo.
      </p>
      <RouterLink class="admin-subscription-canceled__btn" :to="adminLoginTo">
        Volver al inicio de sesión
      </RouterLink>
    </div>
  </main>
</template>
