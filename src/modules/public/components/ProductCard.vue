<script setup lang="ts">
import type { Product } from '../../../core/models';
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

const handleClick = () => {
  emit('open', props.product);
};

const increment = () => {
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
      <div v-if="!product.available" class="product-card__unavailable">
        No disponible
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
          :disabled="!product.available"
          @click="decrement"
        >
          -1
        </BaseButton>
        <span class="qty-value">{{ quantity }}</span>
        <BaseButton
          unstyled
          type="button"
          class="qty-btn"
          :disabled="!product.available"
          @click="increment"
        >
          +1
        </BaseButton>
      </div>
    </div>
  </article>
</template>
