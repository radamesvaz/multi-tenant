<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue';
import { RouterView } from 'vue-router';
import { PUBLIC_STORE_UNAVAILABLE_MESSAGE } from '../../../core/auth/publicBrandingApi';
import { getTenantUiConfig } from '../../../core/config';
import { getMockTenantConfig } from '../../../core/mocks';
import { BaseLink } from '../../../shared/components';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';
import { useTenantStore } from '../../../shared/store';
import { useCartStore } from '../store/cart';
import './PublicLayout.css';

const { tenantSlug } = useCurrentTenant();
const tenantStore = useTenantStore();
const tenantUiConfig = computed(() => getTenantUiConfig(tenantSlug.value));
const tenantConfig = computed(
  () => tenantStore.tenantConfig ?? getMockTenantConfig(tenantSlug.value),
);
const cartStore = useCartStore();

const branding = computed(() => tenantConfig.value.branding);
const hasLogo = computed(() => !!branding.value.logo_url);
const homeRoute = computed(() => `/t/${tenantSlug.value}`);
const cartRoute = computed(() => `/t/${tenantSlug.value}/cart`);

const isStoreUnavailable = computed(() => tenantStore.brandingUnavailable);
const supportPhone = computed(() => tenantUiConfig.value.supportPhone ?? null);

const unavailableMessage = computed(
  () => tenantStore.brandingError ?? PUBLIC_STORE_UNAVAILABLE_MESSAGE,
);

const adminLoginTo = computed(() => ({
  name: 'admin-login' as const,
  params: { tenantSlug: tenantSlug.value },
}));

const tenantThemeStyle = computed(() => ({
  '--tenant-primary': branding.value.primary_color ?? '#2f6d4a',
  '--tenant-secondary': branding.value.secondary_color ?? '#adc8b4',
  '--tenant-accent': branding.value.accent_color ?? '#1f4d34',
}));

function generateFavicon(letter: string, bgColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "DM Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter.toUpperCase(), 32, 34);

  return canvas.toDataURL('image/png');
}

function updateFavicon(dataUrl: string) {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = dataUrl;
}

watch(
  () => tenantSlug.value,
  (slug) => {
    cartStore.initializeForTenant(slug);
    void tenantStore.loadBrandingForSlug(slug);
  },
  { immediate: true },
);

watchEffect(() => {
  const name = tenantUiConfig.value.displayName;
  const color = branding.value.primary_color ?? '#2f6d4a';

  document.title = isStoreUnavailable.value ? 'Tienda no disponible' : name;

  const firstLetter = isStoreUnavailable.value ? '?' : name.charAt(0);
  const faviconUrl = generateFavicon(firstLetter, color);
  if (faviconUrl) {
    updateFavicon(faviconUrl);
  }
});
</script>

<template>
  <div class="store-layout" :class="{ 'store-layout--unavailable': isStoreUnavailable }" :style="tenantThemeStyle">
    <template v-if="isStoreUnavailable">
      <main class="public-unavailable">
        <div class="public-unavailable__card">
          <h1>Esta tienda no está disponible</h1>
          <p>{{ unavailableMessage }}</p>
          <p>
            La tienda puede estar inactiva o con la suscripción cancelada. Contactá a soporte si
            creés que se trata de un error.
          </p>
          <p v-if="supportPhone" class="public-unavailable__support">Soporte: {{ supportPhone }}</p>
          <div class="public-unavailable__actions">
            <RouterLink class="public-unavailable__btn" :to="adminLoginTo">
              Acceso administrador
            </RouterLink>
          </div>
        </div>
      </main>
    </template>

    <template v-else>
      <header class="public-layout__header">
        <BaseLink :to="homeRoute" class="store-brand">
          <img
            v-if="hasLogo"
            :src="branding.logo_url || ''"
            :alt="tenantUiConfig.displayName"
            class="store-brand__logo"
          />
          <span v-else class="store-brand__text">
            {{ tenantUiConfig.displayName }}
          </span>
        </BaseLink>
        <nav class="store-nav">
          <BaseLink :to="homeRoute">Inicio</BaseLink>
          <BaseLink :to="cartRoute">
            Carrito
            <span class="store-nav__badge">{{ cartStore.itemCount }}</span>
          </BaseLink>
        </nav>
      </header>

      <p
        v-if="tenantStore.brandingLoadFailed && !tenantStore.isLoadingBranding"
        class="public-load-error"
        role="alert"
      >
        {{ tenantStore.brandingError }}
      </p>

      <main class="public-layout__content">
        <RouterView />
      </main>
    </template>
  </div>
</template>
