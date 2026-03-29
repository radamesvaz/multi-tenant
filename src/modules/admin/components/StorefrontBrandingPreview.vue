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

const tenantThemeStyle = computed(() => ({
  '--tenant-primary': props.primaryColor,
  '--tenant-secondary': props.secondaryColor,
  '--tenant-accent': props.accentColor,
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
      Simulación de la tienda pública con datos de ejemplo. Los cambios de color y logo se reflejan al instante; usá
      «Guardar» para persistir en el servidor.
    </p>
    <div class="storefront-branding-preview__frame">
      <div class="store-layout storefront-branding-preview__layout" :style="tenantThemeStyle">
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
