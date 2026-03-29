<script setup lang="ts">
import { onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    /** When true, the snackbar is shown. */
    visible: boolean;
    message: string;
    /** Auto-hide after this many ms (0 = no auto-hide). */
    durationMs?: number;
  }>(),
  { durationMs: 4000 },
);

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (hideTimer != null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

watch(
  () => props.visible,
  (open) => {
    clearTimer();
    if (!open || props.durationMs === 0) return;
    hideTimer = setTimeout(() => {
      emit('update:visible', false);
      hideTimer = null;
    }, props.durationMs);
  },
);

onUnmounted(clearTimer);
</script>

<template>
  <Teleport to="body">
    <Transition name="app-snackbar">
      <div
        v-if="visible && message"
        class="app-snackbar"
        role="status"
        aria-live="polite"
      >
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-snackbar {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  color: #f8faf8;
  background: #1f3328;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.app-snackbar-enter-active,
.app-snackbar-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.app-snackbar-enter-from,
.app-snackbar-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

.app-snackbar-enter-to,
.app-snackbar-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
