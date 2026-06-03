<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { formatPendingPaymentMessage } from '../../../core/utils/subscriptionDisplay';
import { useSubscriptionStore } from '../../../shared/store';
import './SubscriptionPendingBanner.css';

const subscriptionStore = useSubscriptionStore();
const { subscription, isLoaded } = storeToRefs(subscriptionStore);

const showBanner = computed(
  () => isLoaded.value && subscription.value?.status === 'pending',
);

const message = computed(() =>
  subscription.value ? formatPendingPaymentMessage(subscription.value) : '',
);
</script>

<template>
  <aside
    v-if="showBanner"
    class="subscription-pending-banner"
    role="status"
    aria-live="polite"
  >
    <p class="subscription-pending-banner__text">{{ message }}</p>
  </aside>
</template>
