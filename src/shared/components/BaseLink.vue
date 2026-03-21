<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { RouterLink } from 'vue-router';

defineOptions({ name: 'BaseLink', inheritAttrs: false });

defineProps<{
  to: RouteLocationRaw;
}>();

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <RouterLink class="base-link" :to="to" v-bind="$attrs">
    <slot />
  </RouterLink>
</template>

<style scoped>
.base-link {
  color: inherit;
  text-decoration: none;
}

.base-link:hover {
  text-decoration: underline;
}

.base-link:focus-visible {
  outline: 2px solid var(--primary, #2f6d4a);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
