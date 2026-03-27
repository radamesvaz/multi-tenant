<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TenantBranding } from '../../../core/models';
import { envConfig } from '../../../core/config/env';
import { tenantService } from '../../../core/services';
import { isValidHexColor, normalizeHexColor } from '../../../core/utils/tenantBranding';
import { useAuthStore, useTenantStore } from '../../../shared/store';
import './AdminBrandingPage.css';

const authStore = useAuthStore();
const tenantStore = useTenantStore();

const tenantSlug = computed(() => authStore.getActiveAdminTenantSlug());

const isLoading = ref(true);
const isSaving = ref(false);
/** Warning when the branding GET failed (empty values / UI defaults apply). */
const loadWarning = ref<string | null>(null);
const saveError = ref<string | null>(null);
const saveSuccess = ref<string | null>(null);

const loadedBranding = ref<TenantBranding | null>(null);

const formPrimary = ref('');
const formSecondary = ref('');
const formAccent = ref('');

const DEFAULT_PRIMARY = '#2F6D4A';
const DEFAULT_SECONDARY = '#ADC8B4';
const DEFAULT_ACCENT = '#1F4D34';

function colorOrDefault(value: string | null | undefined, fallback: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v && isValidHexColor(v)) return normalizeHexColor(v);
  return fallback;
}

function hydrateFormFromBranding(b: TenantBranding) {
  formPrimary.value = colorOrDefault(b.primary_color, DEFAULT_PRIMARY);
  formSecondary.value = colorOrDefault(b.secondary_color, DEFAULT_SECONDARY);
  formAccent.value = colorOrDefault(b.accent_color, DEFAULT_ACCENT);
}

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${envConfig.apiBaseUrl}${u.startsWith('/') ? u : `/${u}`}`;
}

const logoPreviewSrc = computed(() => resolveMediaUrl(loadedBranding.value?.logo_url ?? null));

async function refreshBranding() {
  loadWarning.value = null;
  isLoading.value = true;
  try {
    await tenantStore.loadBrandingForSlug(tenantSlug.value);
    if (tenantStore.brandingError) {
      loadWarning.value = `${tenantStore.brandingError} No se pudieron cargar colores ni logo desde la API.`;
    }
    const b = tenantStore.branding;
    if (!b) {
      loadWarning.value = 'No se pudo obtener el branding.';
      return;
    }
    loadedBranding.value = b;
    hydrateFormFromBranding(b);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void refreshBranding();
});

const previewStyle = computed(() => ({
  '--preview-primary': formPrimary.value || DEFAULT_PRIMARY,
  '--preview-secondary': formSecondary.value || DEFAULT_SECONDARY,
  '--preview-accent': formAccent.value || DEFAULT_ACCENT,
}));

function formColorsValid(): boolean {
  return (
    isValidHexColor(formPrimary.value) &&
    isValidHexColor(formSecondary.value) &&
    isValidHexColor(formAccent.value)
  );
}

const canSave = computed(
  () => !isLoading.value && !isSaving.value && formColorsValid() && loadedBranding.value !== null,
);

async function saveColors() {
  if (!canSave.value) return;
  saveError.value = null;
  saveSuccess.value = null;
  isSaving.value = true;
  const token = authStore.getToken(tenantSlug.value);
  if (!token) {
    saveError.value = 'No hay sesión activa.';
    isSaving.value = false;
    return;
  }
  try {
    await tenantService.updateBrandingColors(token, {
      primary_color: normalizeHexColor(formPrimary.value),
      secondary_color: normalizeHexColor(formSecondary.value),
      accent_color: normalizeHexColor(formAccent.value),
    });
    saveSuccess.value = 'Colores guardados. Actualizando vista previa…';
    await refreshBranding();
    saveSuccess.value = 'Colores guardados correctamente.';
  } catch (e) {
    saveError.value = (e as Error).message || 'No se pudieron guardar los colores.';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="admin-branding">
    <header class="admin-branding__header">
      <h1>Personalización</h1>
      <p class="admin-branding__subtitle">
        Colores de la tienda pública para el tenant <code>{{ tenantSlug }}</code> (
        <code>PATCH /auth/tenant/branding/colors</code>
        ).
      </p>
    </header>

    <div v-if="isLoading" class="admin-branding__state">Cargando…</div>

    <template v-else>
      <p v-if="loadWarning" class="admin-branding__alert admin-branding__alert--warn" role="status">
        {{ loadWarning }}
      </p>
      <p v-if="saveError" class="admin-branding__alert admin-branding__alert--error" role="alert">
        {{ saveError }}
      </p>
      <p v-if="saveSuccess" class="admin-branding__alert admin-branding__alert--ok" role="status">
        {{ saveSuccess }}
      </p>

      <section class="admin-branding__section">
        <h2 class="admin-branding__section-title">Logo</h2>
        <p class="admin-branding__hint">
          La subida o cambio de logo por URL aún no está disponible en la API; aquí solo se muestra el logo
          actual si existe.
        </p>
        <div v-if="logoPreviewSrc" class="admin-branding__logo-block">
          <img
            :src="logoPreviewSrc"
            alt=""
            class="admin-branding__logo-img"
            :style="{
              maxWidth: loadedBranding?.logo_width ? `${loadedBranding.logo_width}px` : '180px',
              maxHeight: loadedBranding?.logo_height ? `${loadedBranding.logo_height}px` : '40px',
            }"
          />
        </div>
        <p v-else class="admin-branding__muted">No hay logo configurado.</p>
      </section>

      <section class="admin-branding__section">
        <h2 class="admin-branding__section-title">Colores</h2>
        <p class="admin-branding__hint">Formato <code>#RRGGBB</code> (hex de 6 dígitos).</p>

        <div class="admin-branding__colors-grid">
          <label class="admin-branding__color-field">
            <span class="admin-branding__label">Primario</span>
            <div class="admin-branding__color-row">
              <input v-model="formPrimary" type="color" class="admin-branding__color-native" />
              <input
                v-model="formPrimary"
                type="text"
                class="admin-branding__input"
                maxlength="7"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
          </label>
          <label class="admin-branding__color-field">
            <span class="admin-branding__label">Secundario</span>
            <div class="admin-branding__color-row">
              <input v-model="formSecondary" type="color" class="admin-branding__color-native" />
              <input
                v-model="formSecondary"
                type="text"
                class="admin-branding__input"
                maxlength="7"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
          </label>
          <label class="admin-branding__color-field">
            <span class="admin-branding__label">Acento</span>
            <div class="admin-branding__color-row">
              <input v-model="formAccent" type="color" class="admin-branding__color-native" />
              <input
                v-model="formAccent"
                type="text"
                class="admin-branding__input"
                maxlength="7"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
          </label>
        </div>

        <p v-if="!formColorsValid()" class="admin-branding__validation" role="alert">
          Revisá que los tres valores sean hex válidos (# y 6 caracteres 0-9, A-F).
        </p>

        <div class="admin-branding__actions">
          <button
            type="button"
            class="admin-branding__btn"
            :disabled="!canSave"
            @click="saveColors"
          >
            {{ isSaving ? 'Guardando…' : 'Guardar colores' }}
          </button>
        </div>
      </section>

      <section class="admin-branding__section">
        <h2 class="admin-branding__section-title">Vista previa</h2>
        <div class="admin-branding__preview" :style="previewStyle">
          <div class="admin-branding__preview-bar">
            <span class="admin-branding__preview-dot admin-branding__preview-dot--primary" />
            <span class="admin-branding__preview-dot admin-branding__preview-dot--secondary" />
            <span class="admin-branding__preview-dot admin-branding__preview-dot--accent" />
          </div>
          <div class="admin-branding__preview-cards">
            <div class="admin-branding__preview-card admin-branding__preview-card--primary">Primario</div>
            <div class="admin-branding__preview-card admin-branding__preview-card--secondary">Secundario</div>
            <div class="admin-branding__preview-card admin-branding__preview-card--accent">Acento</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
