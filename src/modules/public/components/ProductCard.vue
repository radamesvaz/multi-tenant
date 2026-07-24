<script setup lang="ts">
import { computed } from 'vue';
import type { Product } from '../../../core/models';
import { isPurchasable, isSoldOut } from '../../../core/utils';
import { BaseButton } from '../../../shared/components';
import './ProductCard.css';

defineOptions({ name: 'ProductCard' });

const props = defineProps<{
  product: Product;
  quantity: number;
}>();

const emit = defineEmits<{
  open: [product: Product];
  increment: [product: Product];
  decrement: [product: Product];
}>();

const soldOut = computed(() => isSoldOut(props.product));
const canPurchase = computed(() => isPurchasable(props.product));
const canIncrement = computed(() => {
  if (!canPurchase.value) return false;
  if (!props.product.track_inventory) return true;
  return props.quantity < props.product.stock;
});

const handleClick = () => {
  emit('open', props.product);
};

const increment = () => {
  if (!canIncrement.value) return;
  emit('increment', props.product);
};

const decrement = () => {
  emit('decrement', props.product);
};
</script>

<template>
  <article class="product-card" @click="handleClick">
    <div class="product-card__image-container">
      <img
        v-if="product.thumbnail_url"
        :src="product.thumbnail_url"
        :alt="product.name"
        class="product-card__image"
      />
      <div v-if="soldOut" class="product-card__unavailable">
        Agotado
      </div>
    </div>
    <div class="product-card__body">
      <h3 class="product-card__title">
        {{ product.name }}
      </h3>
      <p v-if="product.description" class="product-card__description">
        {{ product.description }}
      </p>
      <p class="product-card__price">
        {{ product.price.toFixed(2) }} €
      </p>
      <div class="product-card__actions" @click.stop>
        <BaseButton
          v-if="quantity > 0"
          unstyled
          type="button"
          class="qty-btn"
          :disabled="!canPurchase"
          @click="decrement"
        >
          -1
        </BaseButton>
        <span class="qty-value">{{ quantity }}</span>
        <BaseButton
          unstyled
          type="button"
          class="qty-btn"
          :disabled="!canIncrement"
          @click="increment"
        >
          +1
        </BaseButton>
      </div>
    </div>
  </article>
</template>
