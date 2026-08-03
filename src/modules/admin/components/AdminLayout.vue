<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { getTenantUiConfig } from '../../../core/config';
import { envConfig } from '../../../core/config/env';
import { displayNameFromJwt } from '../../../core/utils';
import { useAdminSubscriptionRefresh } from '../../../shared/composables/useAdminSubscriptionRefresh';
import { useAuthStore, useSubscriptionStore, useTenantStore } from '../../../shared/store';
import { useAdminHeaderSearch } from '../composables';
import SubscriptionPendingBanner from './SubscriptionPendingBanner.vue';
import './AdminLayout.css';

const isMobileNavOpen = ref(false);
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const tenantStore = useTenantStore();
const { searchInput, onSearchInput, flushSearch, resetSearch } = useAdminHeaderSearch();

const activeTenantSlug = computed(() => authStore.getActiveAdminTenantSlug());

const tenantDisplayName = computed(() => getTenantUiConfig(activeTenantSlug.value).displayName);

const userDisplayName = computed(() => {
  const token = authStore.getToken(activeTenantSlug.value);
  if (!token) return 'Administrador';
  return displayNameFromJwt(token) ?? 'Administrador';
});

const logoSrc = computed(() => {
  const url = tenantStore.branding?.logo_url;
  if (url == null) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${envConfig.apiBaseUrl}${u.startsWith('/') ? u : `/${u}`}`;
});

const pageTitle = computed(() => {
  const title = route.meta.title;
  return typeof title === 'string' && title.length > 0 ? title : 'Admin';
});

const showSearch = computed(() => route.meta.showSearch === true);

const searchPlaceholder = computed(() => {
  const p = route.meta.searchPlaceholder;
  return typeof p === 'string' && p.length > 0 ? p : 'Buscar…';
});

const activeNavKey = computed(() => route.meta.navKey ?? null);

useAdminSubscriptionRefresh();

onMounted(() => {
  void tenantStore.loadBrandingForSlug(activeTenantSlug.value);
});

watch(
  () => route.name,
  () => {
    isMobileNavOpen.value = false;
    resetSearch();
  },
);

function logout() {
  const tenantSlug = authStore.getActiveAdminTenantSlug();
  authStore.clearToken(tenantSlug);
  subscriptionStore.clearSubscription();
  void router.push({ name: 'admin-login', params: { tenantSlug } });
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    flushSearch();
  }
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar" :class="{ 'admin-layout__sidebar--open': isMobileNavOpen }">
      <div class="admin-layout__sidebar-head">
        <div class="admin-layout__brand">
          <span v-if="logoSrc" class="admin-layout__logo-slot">
            <img
              :src="logoSrc"
              alt=""
              class="admin-layout__logo"
              width="160"
              height="48"
              decoding="async"
            />
          </span>
          <span class="admin-layout__brand-name">{{ tenantDisplayName }}</span>
        </div>
        <button type="button" class="admin-layout__icon-btn" aria-label="Cerrar menú" @click="isMobileNavOpen = false">
          <img src="/icons/admin/close.svg" alt="" width="20" height="20" aria-hidden="true" />
        </button>
      </div>

      <nav class="admin-layout__nav" aria-label="Principal">
        <p class="admin-layout__nav-label">Menú</p>
        <RouterLink
          class="admin-layout__nav-link"
          :class="{ 'admin-layout__nav-link--active': activeNavKey === 'orders' }"
          :to="{ name: 'admin-orders' }"
        >
          <img src="/icons/admin/orders.svg" alt="" width="20" height="20" aria-hidden="true" />
          <span>Órdenes</span>
        </RouterLink>
        <RouterLink
          class="admin-layout__nav-link"
          :class="{ 'admin-layout__nav-link--active': activeNavKey === 'products' }"
          :to="{ name: 'admin-products' }"
        >
          <img src="/icons/admin/products.svg" alt="" width="20" height="20" aria-hidden="true" />
          <span>Productos</span>
        </RouterLink>

        <p class="admin-layout__nav-label">Otros</p>
        <RouterLink
          class="admin-layout__nav-link"
          :class="{ 'admin-layout__nav-link--active': activeNavKey === 'settings' }"
          :to="{ name: 'admin-settings' }"
        >
          <img src="/icons/admin/settings.svg" alt="" width="20" height="20" aria-hidden="true" />
          <span>Configuración</span>
        </RouterLink>
      </nav>

      <div class="admin-layout__profile">
        <div class="admin-layout__profile-text">
          <p class="admin-layout__profile-user">{{ userDisplayName }}</p>
          <p class="admin-layout__profile-tenant">{{ tenantDisplayName }}</p>
        </div>
        <button type="button" class="admin-layout__logout" @click="logout">
          <img src="/icons/admin/logout.svg" alt="" width="18" height="18" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <div v-if="isMobileNavOpen" class="admin-layout__backdrop" @click="isMobileNavOpen = false" />

    <section class="admin-layout__main">
      <header class="admin-layout__topbar">
        <button
          type="button"
          class="admin-layout__icon-btn admin-layout__menu-btn"
          aria-label="Abrir menú"
          @click="isMobileNavOpen = true"
        >
          <img src="/icons/admin/menu.svg" alt="" width="22" height="22" aria-hidden="true" />
        </button>
        <h1 class="admin-layout__page-title">{{ pageTitle }}</h1>
        <div v-if="showSearch" class="admin-layout__search">
          <label class="admin-layout__search-label" for="admin-header-search">Buscar</label>
          <div class="admin-layout__search-shell">
            <img
              src="/icons/search.svg"
              alt=""
              class="admin-layout__search-icon"
              width="18"
              height="18"
              aria-hidden="true"
            />
            <input
              id="admin-header-search"
              class="admin-layout__search-input"
              type="search"
              :value="searchInput"
              :placeholder="searchPlaceholder"
              autocomplete="off"
              @input="onSearchInput(($event.target as HTMLInputElement).value)"
              @keydown="onSearchKeydown"
            />
          </div>
        </div>
      </header>
      <SubscriptionPendingBanner />
      <main class="admin-layout__content">
        <RouterView />
      </main>
    </section>
  </div>
</template>
