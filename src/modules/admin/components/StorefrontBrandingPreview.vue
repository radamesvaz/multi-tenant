<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Product } from '../../../core/models';
import ProductCard from '../../public/components/ProductCard.vue';
import { STOREFRONT_PREVIEW_MOCK_PRODUCTS } from '../constants/storefrontPreviewMock';
import '../../public/components/PublicLayout.css';
import '../../public/pages/PublicHomePage.css';
import './StorefrontBrandingPreview.css';

const props = defineProps<{
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoSrc: string | null;
  storeDisplayName: string;
}>();

const products = STOREFRONT_PREVIEW_MOCK_PRODUCTS;

const quantities = ref<Record<number, number>>(
  Object.fromEntries(products.map((p) => [p.id_product, p.id_product === 9001 ? 7 : 0])) as Record<
    number,
    number
  >,
);

/**
 * Solo vista previa admin: regla 60/30/10 como guía (≈60 % lienzo neutro, ~30 % primario+secundario en chrome,
 * ~10 % acento en detalles). La tienda pública sigue el CSS fijado en producción.
 */
type PreviewPresetId = 'production' | 'soft_601030' | 'balanced_601030' | 'strong_601030';

type PreviewPreset = {
  id: PreviewPresetId;
  label: string;
  hint: string;
  headerMix: number;
  pillSecondaryMix: number;
  buttonPrimaryMix: number;
  borderAccentMix: number;
};

const PRESETS: PreviewPreset[] = [
  {
    id: 'production',
    label: 'Como producción',
    hint: 'Igual que la tienda pública hoy: lienzo blanco, cabecera neutra; marca en botones y badge.',
    headerMix: 0,
    pillSecondaryMix: 0,
    buttonPrimaryMix: 44,
    borderAccentMix: 0,
  },
  {
    id: 'soft_601030',
    label: '60/30/10 suave',
    hint: 'Mucho blanco; primario y secundario suaves en cabecera y pills; acento casi solo en bordes.',
    headerMix: 10,
    pillSecondaryMix: 8,
    buttonPrimaryMix: 36,
    borderAccentMix: 6,
  },
  {
    id: 'balanced_601030',
    label: '60/30/10 equilibrado',
    hint: 'Equilibrio típico: lienzo claro, identidad visible en barra y controles, acento en detalle.',
    headerMix: 20,
    pillSecondaryMix: 14,
    buttonPrimaryMix: 44,
    borderAccentMix: 10,
  },
  {
    id: 'strong_601030',
    label: '60/30/10 intenso',
    hint: 'Misma lógica con más saturación en chrome; el texto del contenido sigue neutro.',
    headerMix: 34,
    pillSecondaryMix: 22,
    buttonPrimaryMix: 52,
    borderAccentMix: 16,
  },
];

const presetId = ref<PreviewPresetId>('balanced_601030');

const activePreset = computed(
  () => PRESETS.find((p) => p.id === presetId.value) ?? PRESETS[2],
);

function selectPreset(id: PreviewPresetId) {
  presetId.value = id;
}

const layoutStyle = computed(() => ({
  '--tenant-primary': props.primaryColor,
  '--tenant-secondary': props.secondaryColor,
  '--tenant-accent': props.accentColor,
  '--pv-header-mix': `${activePreset.value.headerMix}%`,
  '--pv-pill-secondary-mix': `${activePreset.value.pillSecondaryMix}%`,
  '--pv-btn-primary-mix': `${activePreset.value.buttonPrimaryMix}%`,
  '--pv-border-accent-mix': `${activePreset.value.borderAccentMix}%`,
  '--pv-canvas-secondary-mix': '0%',
}));

const hasLogo = computed(() => !!props.logoSrc?.trim());

const cartItemCount = computed(() =>
  Object.values(quantities.value).reduce((sum, n) => sum + n, 0),
);

const cartTotal = computed(() =>
  products.reduce((sum, p) => sum + (quantities.value[p.id_product] ?? 0) * p.price, 0),
);

const formattedCartTotal = computed(() =>
  cartTotal.value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
);

const cartItemsLabel = computed(() => (cartItemCount.value === 1 ? 'producto' : 'productos'));

function getQuantity(id: number): number {
  return quantities.value[id] ?? 0;
}

function incrementProduct(product: Product) {
  const q = quantities.value[product.id_product] ?? 0;
  quantities.value = { ...quantities.value, [product.id_product]: q + 1 };
}

function decrementProduct(product: Product) {
  const q = quantities.value[product.id_product] ?? 0;
  quantities.value = { ...quantities.value, [product.id_product]: Math.max(0, q - 1) };
}

function noopProductOpen() {
  /* Preview only: no modal */
}
</script>

<template>
  <div class="storefront-branding-preview">
    <p class="storefront-branding-preview__hint">
      Simulación con datos de ejemplo; los colores y el logo del formulario se aplican al instante («Guardar» persiste en
      el servidor). Elegí un perfil de la regla <strong>60/30/10</strong> (≈60 % lienzo neutro, ~30 % primario y
      secundario en la barra y controles, ~10 % acento en detalles). Solo afecta esta vista previa; la tienda real usa el
      tema del CSS público.
    </p>

    <div class="storefront-branding-preview__controls" aria-label="Perfiles 60/30/10">
      <span class="storefront-branding-preview__controls-title">Perfil de reparto</span>
      <div class="storefront-branding-preview__preset-chips">
        <button
          v-for="p in PRESETS"
          :key="p.id"
          type="button"
          class="storefront-branding-preview__preset-chip"
          :class="{ 'storefront-branding-preview__preset-chip--active': presetId === p.id }"
          :title="p.hint"
          @click="selectPreset(p.id)"
        >
          {{ p.label }}
        </button>
      </div>
      <p class="storefront-branding-preview__preset-detail">{{ activePreset.hint }}</p>
    </div>

    <div class="storefront-branding-preview__frame">
      <div class="store-layout storefront-branding-preview__layout" :style="layoutStyle">
        <header class="public-layout__header">
          <span class="store-brand storefront-branding-preview__no-nav">
            <img
              v-if="hasLogo"
              :src="logoSrc || ''"
              :alt="storeDisplayName"
              class="store-brand__logo"
            />
            <span v-else class="store-brand__text">{{ storeDisplayName }}</span>
          </span>
          <nav class="store-nav">
            <a href="#" class="storefront-branding-preview__fake-link" @click.prevent>Inicio</a>
            <a href="#" class="storefront-branding-preview__fake-link" @click.prevent>
              Carrito
              <span class="store-nav__badge">{{ cartItemCount }}</span>
            </a>
          </nav>
        </header>

        <div
          v-if="cartItemCount > 0"
          class="cart-summary-sticky storefront-branding-preview__cart-pill"
          role="presentation"
        >
          {{ cartItemCount }} {{ cartItemsLabel }} · {{ formattedCartTotal }} €
        </div>

        <main class="public-layout__content">
          <div class="storefront-home">
            <section class="instructions-card">
              <h2>Instrucciones de Uso</h2>
              <ol>
                <li>Añade los productos deseados al carrito</li>
                <li>Al momento de pagar en el carrito, ingresa tus datos de contacto</li>
                <li>WhatsApp se abrirá automáticamente con tu pedido</li>
              </ol>
            </section>

            <section class="products-section">
              <h2 class="products-section__title">Nuestros Productos</h2>
              <div class="product-grid">
                <ProductCard
                  v-for="product in products"
                  :key="product.id_product"
                  :product="product"
                  :quantity="getQuantity(product.id_product)"
                  @open="noopProductOpen"
                  @increment="incrementProduct"
                  @decrement="decrementProduct"
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
