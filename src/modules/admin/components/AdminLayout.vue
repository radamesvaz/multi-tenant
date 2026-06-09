<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAdminSubscriptionRefresh } from '../../../shared/composables/useAdminSubscriptionRefresh';
import { useAuthStore, useSubscriptionStore } from '../../../shared/store';
import SubscriptionPendingBanner from './SubscriptionPendingBanner.vue';
import './AdminLayout.css';

const isMobileNavOpen = ref(false);
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();

const activeTenantSlug = computed(() => authStore.getActiveAdminTenantSlug());
const showInvitationsNav = computed(() => authStore.isAdminForTenant(activeTenantSlug.value));

useAdminSubscriptionRefresh();

watch(
  () => route.fullPath,
  () => {
    isMobileNavOpen.value = false;
  },
);

function logout() {
  const tenantSlug = authStore.getActiveAdminTenantSlug();
  authStore.clearToken(tenantSlug);
  subscriptionStore.clearSubscription();
  void router.push({ name: 'admin-login', params: { tenantSlug } });
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar" :class="{ 'admin-layout__sidebar--open': isMobileNavOpen }">
      <div class="admin-layout__sidebar-head">
        <h2>Admin</h2>
        <button type="button" class="admin-layout__close-nav" @click="isMobileNavOpen = false">
          Cerrar
        </button>
      </div>
      <nav class="admin-layout__nav">
        <RouterLink :to="{ name: 'admin-orders' }">Órdenes</RouterLink>
        <RouterLink :to="{ name: 'admin-products' }">Productos</RouterLink>
        <RouterLink :to="{ name: 'admin-branding' }">Personalización</RouterLink>
        <RouterLink v-if="showInvitationsNav" :to="{ name: 'admin-invitations' }">
          Invitar usuario
        </RouterLink>
      </nav>
    </aside>
    <div v-if="isMobileNavOpen" class="admin-layout__backdrop" @click="isMobileNavOpen = false" />
    <section class="admin-layout__main">
      <header class="admin-layout__topbar">
        <button type="button" class="admin-layout__menu-btn" @click="isMobileNavOpen = true">
          Menú
        </button>
        <h1>Admin panel</h1>
        <button type="button" class="admin-layout__logout-btn" @click="logout">Cerrar sesión</button>
      </header>
      <SubscriptionPendingBanner />
      <main class="admin-layout__content">
        <RouterView />
      </main>
    </section>
  </div>
</template>

