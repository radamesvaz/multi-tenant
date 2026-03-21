<script lang="ts">
import { defineComponent } from 'vue';
import type { Product } from '../../../core/models';
import './ProductCard.css';

export default defineComponent({
  name: 'ProductCard',
  props: {
    product: {
      type: Object as () => Product,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  emits: ['open', 'increment', 'decrement'],
  setup(props, { emit }) {
    const handleClick = () => {
      emit('open', props.product);
    };

    const increment = () => {
      emit('increment', props.product);
    };

    const decrement = () => {
      emit('decrement', props.product);
    };

    return {
      handleClick,
      increment,
      decrement,
    };
  },
});
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
        <button
          v-if="quantity > 0"
          type="button"
          class="qty-btn"
          :disabled="!product.available"
          @click="decrement"
        >
          -1
        </button>
        <span class="qty-value">{{ quantity }}</span>
        <button
          type="button"
          class="qty-btn"
          :disabled="!product.available"
          @click="increment"
        >
          +1
        </button>
      </div>
    </div>
  </article>
</template>

