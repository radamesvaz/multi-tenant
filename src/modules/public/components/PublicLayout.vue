<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue';
import { RouterView, useRoute } from 'vue-router';
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
const route = useRoute();

const branding = computed(() => tenantConfig.value.branding);
const hasLogo = computed(() => !!branding.value.logo_url);
const formattedCartTotal = computed(() =>
  cartStore.totalPrice.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);
const cartItemsLabel = computed(() => (cartStore.itemCount === 1 ? 'producto' : 'productos'));
const homeRoute = computed(() => `/t/${tenantSlug.value}`);
const cartRoute = computed(() => `/t/${tenantSlug.value}/cart`);
const checkoutRoute = computed(() => `/t/${tenantSlug.value}/checkout`);
const shouldShowCartSummary = computed(
  () => route.name === 'public-home' && cartStore.itemCount > 0
);

const tenantThemeStyle = computed(() => ({
  '--tenant-primary': branding.value.primary_color ?? '#2f6d4a',
  '--tenant-secondary': branding.value.secondary_color ?? '#adc8b4',
  '--tenant-accent': branding.value.accent_color ?? '#1f4d34',
}));

const logoStyle = computed(() => {
  if (!hasLogo.value) return {};
  return {
    maxWidth: `${branding.value.logo_width ?? 180}px`,
    maxHeight: `${branding.value.logo_height ?? 40}px`,
  };
});

function generateFavicon(letter: string, bgColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background circle
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  // Letter
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

  document.title = name;

  const firstLetter = name.charAt(0);
  const faviconUrl = generateFavicon(firstLetter, color);
  if (faviconUrl) {
    updateFavicon(faviconUrl);
  }
});
</script>

<template>
  <div class="store-layout" :style="tenantThemeStyle">
    <header class="public-layout__header">
      <BaseLink :to="homeRoute" class="store-brand">
        <img
          v-if="hasLogo"
          :src="branding.logo_url || ''"
          :alt="tenantUiConfig.displayName"
          class="store-brand__logo"
          :style="logoStyle"
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

    <BaseLink v-if="shouldShowCartSummary" :to="checkoutRoute" class="cart-summary-sticky">
      {{ cartStore.itemCount }} {{ cartItemsLabel }} · {{ formattedCartTotal }} €
    </BaseLink>

    <main class="public-layout__content">
      <RouterView />
    </main>
  </div>
</template>

