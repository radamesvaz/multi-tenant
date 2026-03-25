<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { Product } from '../../../core/models';
import { usePublicProductsStore } from '../store/products';
import { useCartStore } from '../store/cart';
import { BaseButton } from '../../../shared/components';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';
import ProductCard from '../components/ProductCard.vue';
import ProductGallery from '../components/ProductGallery.vue';
import './PublicHomePage.css';

const { tenantSlug } = useCurrentTenant();
const productsStore = usePublicProductsStore();
const cartStore = useCartStore();

const isModalOpen = ref(false);
const selectedProduct = ref<Product | null>(null);

onMounted(() => {
  productsStore.loadProducts(tenantSlug.value);
});

onUnmounted(() => {
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
      <div v-if="productsStore.isLoading">Cargando productos...</div>
      <div v-else-if="productsStore.error">
        {{ productsStore.error }}
      </div>
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


