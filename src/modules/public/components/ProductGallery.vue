<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import type { Product } from '../../../core/models';

export default defineComponent({
  name: 'ProductGallery',
  props: {
    product: {
      type: Object as () => Product,
      required: true,
    },
  },
  setup(props) {
    const activeImageIndex = ref(0);

    const galleryImages = computed(() => {
      const productImages = props.product.image_urls ?? [];
      const thumbnail = props.product.thumbnail_url;

      if (!thumbnail || productImages.includes(thumbnail)) {
        return productImages;
      }

      return [thumbnail, ...productImages];
    });

    watch(
      () => props.product.id_product,
      () => {
        activeImageIndex.value = 0;
      }
    );

    watch(galleryImages, (images) => {
      if (activeImageIndex.value >= images.length) {
        activeImageIndex.value = 0;
      }
    });

    const selectImage = (index: number) => {
      if (index < 0 || index >= galleryImages.value.length) {
        return;
      }
      activeImageIndex.value = index;
    };

    return {
      galleryImages,
      activeImageIndex,
      selectImage,
    };
  },
});
</script>

<template>
  <div v-if="galleryImages.length" class="product-gallery">
    <div class="product-gallery__main">
      <!-- Keep all images mounted and only toggle visibility to avoid UI lag on thumbnail switch. -->
      <img
        v-for="(img, index) in galleryImages"
        :key="`${img}-${index}`"
        :src="img"
        :alt="`${product.name} - imagen ${index + 1}`"
        :class="{ 'is-active': index === activeImageIndex }"
        class="product-gallery__main-image"
      />
    </div>

    <div class="product-gallery__thumbnails">
      <button
        v-for="(img, index) in galleryImages"
        :key="`thumb-${img}-${index}`"
        type="button"
        :aria-label="`Ver imagen ${index + 1} de ${galleryImages.length}`"
        @click="selectImage(index)"
        :class="{ 'is-active': index === activeImageIndex }"
      >
        <img :src="img" :alt="`${product.name} - miniatura ${index + 1}`" />
      </button>
    </div>
  </div>
</template>

