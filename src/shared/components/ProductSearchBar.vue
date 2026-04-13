<script setup lang="ts">
defineOptions({ name: 'ProductSearchBar' });

withDefaults(
  defineProps<{
    id: string;
    placeholder?: string;
    variant?: 'storefront' | 'admin';
  }>(),
  {
    placeholder: 'Al menos 2 letras (prefijo del nombre)',
    variant: 'storefront',
  },
);

const modelValue = defineModel<string>({ required: true });
</script>

<template>
  <div class="product-search" :class="`product-search--${variant}`">
    <label :for="id" class="product-search__label">Buscador</label>
    <div class="product-search__shell">
      <div class="product-search__field">
        <input
          :id="id"
          v-model="modelValue"
          type="search"
          class="product-search__input"
          :placeholder="placeholder"
          autocomplete="off"
        />
      </div>
      <img
        src="/icons/search.svg"
        alt=""
        class="product-search__icon"
        width="22"
        height="22"
        aria-hidden="true"
        decoding="async"
      />
    </div>
  </div>
</template>

<style scoped>
.product-search {
  width: 100%;
}

.product-search--storefront {
  max-width: 420px;
  margin: 0 auto;
}

.product-search--admin {
  max-width: 28rem;
}

.product-search__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.product-search__shell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px 9px 9px;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}

/**
 * Fondo del buscador: solo colores de branding (no primario).
 * Mezcla acento + secundario del GET `/t/.../tenant/branding` para que entre ambos
 * tokens del backend; el acento aporta contraste con el icono claro.
 */
.product-search--storefront .product-search__shell {
  background: color-mix(
    in srgb,
    var(--tenant-accent, #1f4d34) 62%,
    var(--tenant-secondary, #adc8b4) 38%
  );
}

.product-search--admin .product-search__shell {
  background: #2e7d5a;
}

.product-search__shell:focus-within {
  outline: 2px solid rgba(255, 255, 255, 0.95);
  outline-offset: 2px;
}

.product-search--storefront .product-search__shell:focus-within {
  outline-color: color-mix(
    in srgb,
    color-mix(in srgb, var(--tenant-accent, #1f4d34) 62%, var(--tenant-secondary, #adc8b4) 38%) 55%,
    #000
  );
}

.product-search--admin .product-search__shell:focus-within {
  outline-color: #1b5c40;
}

.product-search__field {
  flex: 1;
  min-width: 0;
  border-radius: 999px;
  background: #fff;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.07);
}

.product-search__input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  font: inherit;
  font-size: var(--font-sm, 0.875rem);
  line-height: 1.35;
  background: transparent;
  color: inherit;
  -webkit-appearance: none;
  appearance: none;
}

.product-search--storefront .product-search__input {
  color: var(--tenant-text, #1a1a1a);
}

.product-search--storefront .product-search__input::placeholder {
  color: var(--tenant-muted, #6b7280);
}

.product-search--admin .product-search__input {
  font-size: 0.95rem;
  color: #1a211c;
}

.product-search--admin .product-search__input::placeholder {
  color: #6b756f;
}

.product-search__input:focus {
  outline: none;
}

.product-search__input::-webkit-search-decoration,
.product-search__input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.product-search__icon {
  flex-shrink: 0;
  display: block;
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.95;
  pointer-events: none;
}
</style>
