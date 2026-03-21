<script lang="ts">
import { computed, defineComponent, onUnmounted, ref, watch } from 'vue';
import type { Product } from '../../../core/models';
import { BaseButton } from '../../../shared/components';
import './ProductGallery.css';

export default defineComponent({
  name: 'ProductGallery',
  components: { BaseButton },
  props: {
    product: {
      type: Object as () => Product,
      required: true,
    },
  },
  setup(props) {
    const SWIPE_THRESHOLD_PX = 50;
    const SWIPE_HORIZONTAL_RATIO = 1.2;
    const SWIPE_COOLDOWN_MS = 120;
    const TRANSITION_MS = 170;

    const activeImageIndex = ref(0);
    const previousImageIndex = ref(-1);
    const transitionDirection = ref<'next' | 'prev'>('next');
    const isTransitioning = ref(false);
    const touchStartX = ref(0);
    const touchStartY = ref(0);
    const lastSwipeAt = ref(0);
    const suppressNextMainClick = ref(false);
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;

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
        if (transitionTimer) {
          clearTimeout(transitionTimer);
          transitionTimer = undefined;
        }
        activeImageIndex.value = 0;
        previousImageIndex.value = -1;
        isTransitioning.value = false;
      }
    );

    watch(galleryImages, (images) => {
      if (activeImageIndex.value >= images.length) {
        activeImageIndex.value = 0;
      }
    });

    onUnmounted(() => {
      if (transitionTimer) {
        clearTimeout(transitionTimer);
      }
    });

    const navigateToImage = (index: number, explicitDirection?: 'next' | 'prev') => {
      if (index < 0 || index >= galleryImages.value.length) {
        return;
      }
      if (index === activeImageIndex.value) {
        return;
      }

      if (transitionTimer) {
        clearTimeout(transitionTimer);
      }

      previousImageIndex.value = activeImageIndex.value;
      transitionDirection.value =
        explicitDirection ?? (index > activeImageIndex.value ? 'next' : 'prev');
      activeImageIndex.value = index;
      isTransitioning.value = true;

      transitionTimer = setTimeout(() => {
        previousImageIndex.value = -1;
        isTransitioning.value = false;
        transitionTimer = undefined;
      }, TRANSITION_MS);
    };

    const selectImage = (index: number) => {
      navigateToImage(index);
    };

    const goToNextImage = () => {
      if (activeImageIndex.value >= galleryImages.value.length - 1) {
        return;
      }
      navigateToImage(activeImageIndex.value + 1, 'next');
    };

    const goToPreviousImage = () => {
      if (activeImageIndex.value <= 0) {
        return;
      }
      navigateToImage(activeImageIndex.value - 1, 'prev');
    };

    const onMainTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      touchStartX.value = touch.clientX;
      touchStartY.value = touch.clientY;
    };

    const onMainTouchEnd = (event: TouchEvent) => {
      if (galleryImages.value.length <= 1) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      const now = Date.now();
      if (now - lastSwipeAt.value < SWIPE_COOLDOWN_MS) {
        return;
      }

      const deltaX = touch.clientX - touchStartX.value;
      const deltaY = touch.clientY - touchStartY.value;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      const isHorizontalSwipe =
        absDeltaX >= SWIPE_THRESHOLD_PX && absDeltaX > absDeltaY * SWIPE_HORIZONTAL_RATIO;

      if (!isHorizontalSwipe) {
        return;
      }

      suppressNextMainClick.value = true;
      lastSwipeAt.value = now;
      if (deltaX < 0) {
        goToNextImage();
      } else {
        goToPreviousImage();
      }
    };

    const onMainTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - touchStartX.value;
      const deltaY = touch.clientY - touchStartY.value;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Prevent browser horizontal-swipe navigation hints/arrows.
      if (absDeltaX > 12 && absDeltaX > absDeltaY * SWIPE_HORIZONTAL_RATIO) {
        event.preventDefault();
      }
    };

    const onMainClick = (event: MouseEvent) => {
      if (galleryImages.value.length <= 1) {
        return;
      }

      if (suppressNextMainClick.value) {
        suppressNextMainClick.value = false;
        return;
      }

      const target = event.currentTarget as HTMLElement | null;
      if (!target) {
        return;
      }

      const bounds = target.getBoundingClientRect();
      const clickX = event.clientX - bounds.left;
      const isLeftHalf = clickX < bounds.width / 2;

      if (isLeftHalf) {
        goToPreviousImage();
      } else {
        goToNextImage();
      }
    };

    const getMainImageClass = (index: number) => {
      if (index === activeImageIndex.value) {
        return {
          'is-active': true,
          'anim-enter-forward': isTransitioning.value && transitionDirection.value === 'next',
          'anim-enter-backward': isTransitioning.value && transitionDirection.value === 'prev',
        };
      }

      if (index === previousImageIndex.value) {
        return {
          'is-previous': true,
          'anim-leave-forward': isTransitioning.value && transitionDirection.value === 'next',
          'anim-leave-backward': isTransitioning.value && transitionDirection.value === 'prev',
        };
      }

      return {};
    };

    return {
      galleryImages,
      activeImageIndex,
      selectImage,
      onMainTouchStart,
      onMainTouchMove,
      onMainTouchEnd,
      onMainClick,
      getMainImageClass,
    };
  },
});
</script>

<template>
  <div v-if="galleryImages.length" class="product-gallery">
    <div
      class="product-gallery__main"
      @touchstart="onMainTouchStart"
      @touchmove="onMainTouchMove"
      @touchend="onMainTouchEnd"
      @click="onMainClick"
    >
      <!-- Keep all images mounted and only toggle visibility to avoid UI lag on thumbnail switch. -->
      <img
        v-for="(img, index) in galleryImages"
        :key="`${img}-${index}`"
        :src="img"
        :alt="`${product.name} - imagen ${index + 1}`"
        :class="getMainImageClass(index)"
        class="product-gallery__main-image"
      />
    </div>

    <div class="product-gallery__thumbnails">
      <BaseButton
        v-for="(img, index) in galleryImages"
        :key="`thumb-${img}-${index}`"
        unstyled
        type="button"
        :aria-label="`Ver imagen ${index + 1} de ${galleryImages.length}`"
        :class="{ 'is-active': index === activeImageIndex }"
        @click="selectImage(index)"
      >
        <img :src="img" :alt="`${product.name} - miniatura ${index + 1}`" />
      </BaseButton>
    </div>
  </div>
</template>

