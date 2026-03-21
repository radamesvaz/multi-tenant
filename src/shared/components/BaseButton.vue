<script setup lang="ts">
defineOptions({ name: 'BaseButton', inheritAttrs: false });

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

withDefaults(
  defineProps<{
    /** Texto por defecto si no usas slot */
    label?: string;
    variant?: ButtonVariant;
    /**
     * Sin clases del design system: el `<button>` solo recibe attrs (p. ej. `.qty-btn`, estilos de página).
     */
    unstyled?: boolean;
  }>(),
  {
    label: '',
    variant: 'primary',
    unstyled: false,
  },
);

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <button
    type="button"
    :class="unstyled ? undefined : ['base-button', `base-button--${variant}`]"
    v-bind="$attrs"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin: 0;
  font: inherit;
  font-family: inherit;
  font-weight: 600;
  font-size: var(--font-sm, 0.875rem);
  line-height: var(--leading-tight, 1.2);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.5rem 1rem;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-button:focus-visible {
  outline: 2px solid var(--primary, #2f6d4a);
  outline-offset: 2px;
}

.base-button--primary {
  color: #fff;
  background-color: var(--primary, #2f6d4a);
  border-color: var(--primary, #2f6d4a);
}

.base-button--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.base-button--secondary {
  color: var(--text, #1d2d1f);
  background-color: var(--card, #ffffff);
  border-color: var(--line, #dde2dd);
}

.base-button--secondary:hover:not(:disabled) {
  background-color: var(--bg, #f5f4ef);
}

.base-button--ghost {
  color: var(--primary, #2f6d4a);
  background-color: transparent;
  border-color: transparent;
}

.base-button--ghost:hover:not(:disabled) {
  background-color: var(--bg, #f5f4ef);
}
</style>
