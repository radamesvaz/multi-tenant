<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { Product } from '../../../core/models';
import { usePublicProductsStore } from '../store/products';
import { useCartStore } from '../store/cart';
import { BaseButton, BaseLink } from '../../../shared/components';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';
import ProductCard from '../components/ProductCard.vue';
import ProductGallery from '../components/ProductGallery.vue';
import './PublicHomePage.css';

const SEARCH_DEBOUNCE_MS = 400;

const { tenantSlug } = useCurrentTenant();
const productsStore = usePublicProductsStore();
const cartStore = useCartStore();

const isModalOpen = ref(false);
const selectedProduct = ref<Product | null>(null);

const searchInput = ref('');
const debouncedSearch = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (v) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = v.trim();
  }, SEARCH_DEBOUNCE_MS);
});

watch(
  [tenantSlug, debouncedSearch],
  () => {
    void productsStore.loadFirstPage(tenantSlug.value, debouncedSearch.value);
  },
  { immediate: true },
);

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  document.body.style.overflow = '';
});

watch(isModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

const openProduct = (product: Product) => {
  selectedProduct.value = product;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedProduct.value = null;
};

const getProductQuantity = (productId: number) => {
  const item = cartStore.items.find((entry) => entry.product.id_product === productId);
  return item?.quantity ?? 0;
};

const incrementProduct = (product: Product) => {
  cartStore.addItem(product, 1);
};

const decrementProduct = (product: Product) => {
  const current = getProductQuantity(product.id_product);
  cartStore.updateQuantity(product.id_product, current - 1);
};

const checkoutRoute = computed(() => `/t/${tenantSlug.value}/checkout`);

const formattedCartTotal = computed(() =>
  cartStore.totalPrice.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
);

const cartItemsLabel = computed(() => (cartStore.itemCount === 1 ? 'producto' : 'productos'));
</script>

<template>
  <main class="storefront-home">
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
      <div class="products-section__search-sticky">
        <div class="products-section__search">
          <label class="products-section__search-label" for="storefront-product-search">Buscador</label>
          <input
            id="storefront-product-search"
            v-model="searchInput"
            type="search"
            class="products-section__search-input"
            placeholder="Al menos 2 letras (prefijo del nombre)"
            autocomplete="off"
          />
        </div>
      </div>

      <BaseLink
        v-if="cartStore.itemCount > 0"
        :to="checkoutRoute"
        class="cart-summary-sticky cart-summary-sticky--below-search"
      >
        {{ cartStore.itemCount }} {{ cartItemsLabel }} · {{ formattedCartTotal }} €
      </BaseLink>
      <div v-if="productsStore.isLoading && productsStore.products.length === 0">Cargando productos...</div>
      <div v-else-if="productsStore.error && productsStore.products.length === 0" class="products-section__error">
        {{ productsStore.error }}
      </div>
      <template v-else>
        <p v-if="productsStore.error" class="products-section__error products-section__error--soft" role="alert">
          {{ productsStore.error }}
        </p>
        <div v-if="productsStore.products.length === 0" class="products-section__empty">No hay productos para mostrar.</div>
        <div v-else class="product-grid">
          <ProductCard
            v-for="product in productsStore.products"
            :key="product.id_product"
            :product="product"
            :quantity="getProductQuantity(product.id_product)"
            @open="openProduct"
            @increment="incrementProduct"
            @decrement="decrementProduct"
          />
        </div>
        <div v-if="productsStore.hasMore" class="products-section__more">
          <BaseButton
            type="button"
            class="products-section__load-more"
            :disabled="productsStore.isLoadingMore"
            @click="productsStore.loadMore(tenantSlug)"
          >
            {{ productsStore.isLoadingMore ? 'Cargando…' : 'Cargar más' }}
          </BaseButton>
        </div>
      </template>
    </section>

    <section v-if="isModalOpen && selectedProduct" class="product-modal">
      <div class="product-modal__backdrop" @click="closeModal" />
      <div class="product-modal__card">
        <BaseButton
          unstyled
          type="button"
          class="product-modal__close"
          aria-label="Cerrar"
          @click="closeModal"
        >
          ×
        </BaseButton>

        <h2 class="product-modal__title">{{ selectedProduct.name }}</h2>

        <ProductGallery :product="selectedProduct" />

        <p class="product-modal__price">{{ selectedProduct.price.toFixed(2) }} €</p>

        <p v-if="selectedProduct.description" class="product-modal__description">
          {{ selectedProduct.description }}
        </p>

        <div class="product-modal__actions">
          <BaseButton
            v-if="getProductQuantity(selectedProduct.id_product) > 0"
            unstyled
            type="button"
            class="qty-btn"
            @click="decrementProduct(selectedProduct)"
          >
            -1
          </BaseButton>
          <span class="qty-value">{{ getProductQuantity(selectedProduct.id_product) }}</span>
          <BaseButton
            unstyled
            type="button"
            class="qty-btn"
            @click="incrementProduct(selectedProduct)"
          >
            +1
          </BaseButton>
        </div>
      </div>
    </section>
  </main>
</template>


