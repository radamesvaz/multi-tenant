<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';
import { useCartStore } from '../store/cart';
import './PublicCartPage.css';

const { tenantSlug } = useCurrentTenant();
const cartStore = useCartStore();

onMounted(() => {
  cartStore.initializeForTenant(tenantSlug.value);
});

const checkoutRoute = computed(() => `/t/${tenantSlug.value}/checkout`);

const formattedTotal = computed(() =>
  cartStore.totalPrice.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

const getItemSubtotal = (price: number, quantity: number) =>
  (price * quantity).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const increment = (productId: number) => {
  const current = cartStore.items.find((item) => item.product.id_product === productId);
  if (!current) return;
  cartStore.updateQuantity(productId, current.quantity + 1);
};

const decrement = (productId: number) => {
  const current = cartStore.items.find((item) => item.product.id_product === productId);
  if (!current) return;
  cartStore.updateQuantity(productId, current.quantity - 1);
};
</script>

<template>
  <main class="cart-page">
    <header class="cart-page__header">
      <h1>Tu carrito</h1>
      <p>{{ cartStore.itemCount }} producto(s) en tu pedido</p>
    </header>

    <section v-if="cartStore.items.length === 0" class="cart-page__empty">
      <p>No hay artículos en el carrito</p>
      <p>Agrega productos para continuar con tu pedido.</p>
    </section>

    <section v-else class="cart-list">
      <article v-for="item in cartStore.items" :key="item.product.id_product" class="cart-item">
        <img
          v-if="item.product.thumbnail_url"
          :src="item.product.thumbnail_url"
          :alt="item.product.name"
          class="cart-item__image"
        />
        <div class="cart-item__info">
          <h2>{{ item.product.name }}</h2>
          <p class="cart-item__price">{{ item.product.price.toFixed(2) }} € c/u</p>
          <p class="cart-item__subtotal">
            Subtotal: {{ getItemSubtotal(item.product.price, item.quantity) }} €
          </p>
          <div class="cart-item__actions">
            <button type="button" class="qty-btn" @click="decrement(item.product.id_product)">
              -1
            </button>
            <span class="qty-value">{{ item.quantity }}</span>
            <button type="button" class="qty-btn" @click="increment(item.product.id_product)">
              +1
            </button>
          </div>
        </div>
      </article>
    </section>

    <footer class="cart-page__footer">
      <div>
        <span>Total</span>
        <strong>{{ formattedTotal }} €</strong>
      </div>
      <RouterLink :to="checkoutRoute" class="cart-page__checkout" :aria-disabled="cartStore.items.length === 0">
        Ir a checkout
      </RouterLink>
    </footer>
  </main>
</template>

