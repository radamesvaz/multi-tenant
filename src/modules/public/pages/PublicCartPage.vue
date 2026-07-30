<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { productService } from '../../../core/services';
import { isPurchasable, isSoldOut, remainingPurchasableQuantity } from '../../../core/utils';
import { BaseButton, BaseLink } from '../../../shared/components';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';
import { useNotification } from '../../../shared/composables/useNotification';
import { useCartStore } from '../store/cart';
import './PublicCartPage.css';

type ValidationIssueType = 'NOT_FOUND' | 'UNAVAILABLE' | 'INSUFFICIENT_STOCK' | 'PRICE_CHANGED';

type ValidationIssue = {
  productId: number;
  productName: string;
  type: ValidationIssueType;
  message: string;
};

const { tenantSlug } = useCurrentTenant();
const cartStore = useCartStore();
const { notifyError } = useNotification();

const isValidatingCatalog = ref(false);
const validationIssues = ref<ValidationIssue[]>([]);

const checkoutRoute = computed(() => `/t/${tenantSlug.value}/checkout`);

const formattedTotal = computed(() =>
  cartStore.totalPrice.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

const hasBlockingConflicts = computed(() =>
  validationIssues.value.some((issue) =>
    ['NOT_FOUND', 'UNAVAILABLE', 'INSUFFICIENT_STOCK'].includes(issue.type)
  )
);

const canGoToCheckout = computed(
  () =>
    cartStore.items.length > 0 &&
    !isValidatingCatalog.value &&
    !hasBlockingConflicts.value
);

const getItemSubtotal = (price: number, quantity: number) =>
  (price * quantity).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getIssueTypeLabel = (type: ValidationIssueType) => {
  switch (type) {
    case 'NOT_FOUND':
      return 'No encontrado';
    case 'UNAVAILABLE':
      return 'Sin disponibilidad';
    case 'INSUFFICIENT_STOCK':
      return 'Stock insuficiente';
    case 'PRICE_CHANGED':
      return 'Precio actualizado';
    default:
      return 'Actualización';
  }
};

const validateCartWithCatalog = async () => {
  if (cartStore.items.length === 0) {
    validationIssues.value = [];
    return;
  }

  isValidatingCatalog.value = true;

  try {
    const catalog = await productService.fetchAllTenantProducts(tenantSlug.value);
    const map = new Map(catalog.map((product) => [product.id_product, product]));
    const issues: ValidationIssue[] = [];

    const nextItems = cartStore.items.map((item) => {
      const fromCatalog = map.get(item.product.id_product);
      if (!fromCatalog) {
        issues.push({
          productId: item.product.id_product,
          productName: item.product.name,
          type: 'NOT_FOUND',
          message: 'Este producto ya no está disponible en el catálogo.',
        });
        return item;
      }

      if (!isPurchasable(fromCatalog)) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'UNAVAILABLE',
          message: isSoldOut(fromCatalog)
            ? 'Producto agotado.'
            : 'Producto sin disponibilidad actual.',
        });
      } else if (fromCatalog.track_inventory && item.quantity > fromCatalog.stock) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'INSUFFICIENT_STOCK',
          message: `Stock disponible: ${fromCatalog.stock}. Ajusta la cantidad.`,
        });
      }

      if (fromCatalog.price !== item.product.price) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'PRICE_CHANGED',
          message: `Precio actualizado a ${fromCatalog.price.toFixed(2)} €.`,
        });
      }

      return {
        ...item,
        product: fromCatalog,
      };
    });

    cartStore.replaceItems(nextItems);
    validationIssues.value = issues;
  } catch (error) {
    notifyError((error as Error).message);
  } finally {
    isValidatingCatalog.value = false;
  }
};

const canIncrement = (productId: number) => {
  const current = cartStore.items.find((item) => item.product.id_product === productId);
  if (!current) return false;
  return remainingPurchasableQuantity(current.product, current.quantity) > 0;
};

const increment = (productId: number) => {
  const current = cartStore.items.find((item) => item.product.id_product === productId);
  if (!current) return;
  cartStore.addItem(current.product, 1);
  void validateCartWithCatalog();
};

const decrement = (productId: number) => {
  const current = cartStore.items.find((item) => item.product.id_product === productId);
  if (!current) return;
  cartStore.updateQuantity(productId, current.quantity - 1);
  void validateCartWithCatalog();
};

onMounted(() => {
  cartStore.initializeForTenant(tenantSlug.value);
  void validateCartWithCatalog();
});
</script>

<template>
  <main class="cart-page">
    <header class="cart-page__header">
      <h1>Tu carrito</h1>
      <p>
        {{ cartStore.itemCount }} producto(s) en tu pedido
        <span v-if="isValidatingCatalog"> · Validando…</span>
      </p>
    </header>

    <section v-if="cartStore.items.length === 0" class="cart-page__empty">
      <p>No hay artículos en el carrito</p>
      <p>Agrega productos para continuar con tu pedido.</p>
    </section>

    <template v-else>
      <section class="cart-list">
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
              <BaseButton
                unstyled
                type="button"
                class="qty-btn"
                @click="decrement(item.product.id_product)"
              >
                -1
              </BaseButton>
              <span class="qty-value">{{ item.quantity }}</span>
              <BaseButton
                unstyled
                type="button"
                class="qty-btn"
                :disabled="!canIncrement(item.product.id_product)"
                @click="increment(item.product.id_product)"
              >
                +1
              </BaseButton>
            </div>
          </div>
        </article>
      </section>

      <section v-if="validationIssues.length" class="cart-issues">
        <h3>Revisión de carrito</h3>
        <ul>
          <li v-for="issue in validationIssues" :key="`${issue.type}-${issue.productId}`">
            <strong>{{ getIssueTypeLabel(issue.type) }}:</strong>
            {{ issue.productName }} - {{ issue.message }}
          </li>
        </ul>
      </section>
    </template>

    <footer class="cart-page__footer">
      <div>
        <span>Total</span>
        <strong>{{ formattedTotal }} €</strong>
      </div>
      <BaseLink
        v-if="canGoToCheckout"
        :to="checkoutRoute"
        class="cart-page__checkout"
      >
        Finalizar compra
      </BaseLink>
      <span
        v-else
        class="cart-page__checkout cart-page__checkout--disabled"
        aria-disabled="true"
      >
        {{ isValidatingCatalog ? 'Validando…' : 'Finalizar compra' }}
      </span>
    </footer>
  </main>
</template>
