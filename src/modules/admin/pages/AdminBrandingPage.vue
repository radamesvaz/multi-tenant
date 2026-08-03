<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { TenantBranding } from '../../../core/models';
import { getTenantUiConfig } from '../../../core/config';
import { envConfig } from '../../../core/config/env';
import { logoUploadHintEs } from '../../../core/constants/logoSpec';
import { tenantService } from '../../../core/services';
import { isValidHexColor, normalizeHexColor } from '../../../core/utils/tenantBranding';
import { AppSnackbar } from '../../../shared/components';
import { useAuthStore, useTenantStore } from '../../../shared/store';
import StorefrontBrandingPreview from '../components/StorefrontBrandingPreview.vue';
import './AdminBrandingPage.css';

const authStore = useAuthStore();
const tenantStore = useTenantStore();

const tenantSlug = computed(() => authStore.getActiveAdminTenantSlug());

const WHATSAPP_PHONE_MAX_LEN = 20;
const logoUploadHint = logoUploadHintEs();

const isLoading = ref(true);
const isSaving = ref(false);
const isSavingWhatsapp = ref(false);
const isUploadingLogo = ref(false);
/** Warning when the branding GET failed (empty values / UI defaults apply). */
const loadWarning = ref<string | null>(null);
const saveError = ref<string | null>(null);
const logoError = ref<string | null>(null);
const whatsappError = ref<string | null>(null);
const snackbarOpen = ref(false);
const snackbarMessage = ref('');

function showSnackbar(message: string) {
  snackbarMessage.value = message;
  snackbarOpen.value = true;
}

const loadedBranding = ref<TenantBranding | null>(null);

const logoFileInput = ref<HTMLInputElement | null>(null);
const pendingLogoFile = ref<File | null>(null);
const logoLocalPreviewUrl = ref<string | null>(null);

const formPrimary = ref('');
const formSecondary = ref('');
const formAccent = ref('');
const formWhatsappPhone = ref('');

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
  formWhatsappPhone.value = b.whatsapp_phone ?? '';
}

const whatsappPhoneTrimmed = computed(() => formWhatsappPhone.value.trim());
const whatsappIsEmpty = computed(() => whatsappPhoneTrimmed.value.length === 0);
const whatsappTooLong = computed(
  () => whatsappPhoneTrimmed.value.length > WHATSAPP_PHONE_MAX_LEN,
);

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${envConfig.apiBaseUrl}${u.startsWith('/') ? u : `/${u}`}`;
}

const logoPreviewSrc = computed(() => resolveMediaUrl(loadedBranding.value?.logo_url ?? null));

const displayLogoSrc = computed(() => logoLocalPreviewUrl.value ?? logoPreviewSrc.value);

function revokeLogoLocalPreview() {
  if (logoLocalPreviewUrl.value) {
    URL.revokeObjectURL(logoLocalPreviewUrl.value);
    logoLocalPreviewUrl.value = null;
  }
  pendingLogoFile.value = null;
}

onUnmounted(() => {
  revokeLogoLocalPreview();
});

function triggerLogoFilePicker() {
  logoFileInput.value?.click();
}

function handleLogoFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  logoError.value = null;
  if (!file) {
    revokeLogoLocalPreview();
    return;
  }
  revokeLogoLocalPreview();
  pendingLogoFile.value = file;
  logoLocalPreviewUrl.value = URL.createObjectURL(file);
}

const hasPendingLogoFile = computed(() => pendingLogoFile.value !== null);

async function uploadLogo() {
  if (!pendingLogoFile.value) return;
  logoError.value = null;
  const token = authStore.getToken(tenantSlug.value);
  if (!token) {
    logoError.value = 'No hay sesión activa.';
    return;
  }
  isUploadingLogo.value = true;
  try {
    await tenantService.patchTenantBrandingLogo(token, pendingLogoFile.value);
    revokeLogoLocalPreview();
    if (logoFileInput.value) logoFileInput.value.value = '';
    await refreshBranding();
    showSnackbar('Cambios realizados');
  } catch (err) {
    logoError.value = (err as Error).message || 'No se pudo subir el logo.';
  } finally {
    isUploadingLogo.value = false;
  }
}

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

const storeDisplayName = computed(() => getTenantUiConfig(tenantSlug.value).displayName);

function formColorsValid(): boolean {
  return (
    isValidHexColor(formPrimary.value) &&
    isValidHexColor(formSecondary.value) &&
    isValidHexColor(formAccent.value)
  );
}

const canSave = computed(
  () =>
    !isLoading.value &&
    !isSaving.value &&
    !isSavingWhatsapp.value &&
    !isUploadingLogo.value &&
    formColorsValid() &&
    loadedBranding.value !== null,
);

const canUploadLogo = computed(
  () =>
    !isLoading.value &&
    !isSaving.value &&
    !isSavingWhatsapp.value &&
    !isUploadingLogo.value &&
    hasPendingLogoFile.value &&
    loadedBranding.value !== null,
);

const canSaveWhatsapp = computed(
  () =>
    !isLoading.value &&
    !isSaving.value &&
    !isSavingWhatsapp.value &&
    !isUploadingLogo.value &&
    !whatsappTooLong.value &&
    loadedBranding.value !== null,
);

async function saveColors() {
  if (!canSave.value) return;
  saveError.value = null;
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
    await refreshBranding();
    showSnackbar('Cambios realizados');
  } catch (e) {
    saveError.value = (e as Error).message || 'No se pudieron guardar los colores.';
  } finally {
    isSaving.value = false;
  }
}

async function saveWhatsapp() {
  if (!canSaveWhatsapp.value) return;
  whatsappError.value = null;
  isSavingWhatsapp.value = true;
  const token = authStore.getToken(tenantSlug.value);
  if (!token) {
    whatsappError.value = 'No hay sesión activa.';
    isSavingWhatsapp.value = false;
    return;
  }
  try {
    // Always send the key; `""` clears the store WhatsApp.
    await tenantService.updateBrandingWhatsapp(token, {
      whatsapp_phone: whatsappPhoneTrimmed.value,
    });
    await refreshBranding();
    showSnackbar(
      whatsappPhoneTrimmed.value
        ? 'WhatsApp de la tienda actualizado'
        : 'WhatsApp de la tienda eliminado',
    );
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 403) {
      whatsappError.value = 'No tenés permiso para actualizar el WhatsApp de la tienda.';
    } else {
      whatsappError.value =
        (e as Error).message || 'No se pudo guardar el WhatsApp de la tienda.';
    }
  } finally {
    isSavingWhatsapp.value = false;
  }
}
</script>

<template>
  <AppSnackbar v-model:visible="snackbarOpen" :message="snackbarMessage" />
  <div class="admin-branding">
    <header class="admin-branding__header">
      <RouterLink :to="{ name: 'admin-settings' }" class="admin-branding__back">
        ← Configuración
      </RouterLink>
      <p class="admin-branding__subtitle">
        Logo, colores y WhatsApp de la tienda (destino de pedidos del checkout).
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
      <p v-if="logoError" class="admin-branding__alert admin-branding__alert--error" role="alert">
        {{ logoError }}
      </p>
      <p v-if="whatsappError" class="admin-branding__alert admin-branding__alert--error" role="alert">
        {{ whatsappError }}
      </p>

      <section class="admin-branding__section">
        <h2 class="admin-branding__section-title">WhatsApp de la tienda</h2>
        <p class="admin-branding__hint">
          Número al que llegan los pedidos del checkout. No es el teléfono personal del administrador.
          Máximo {{ WHATSAPP_PHONE_MAX_LEN }} caracteres. Dejá vacío y guardá para quitarlo.
        </p>
        <p
          v-if="whatsappIsEmpty && !whatsappError"
          class="admin-branding__alert admin-branding__alert--warn"
          role="status"
        >
          Configurá el WhatsApp de la tienda para que el checkout pueda abrir el mensaje del pedido.
        </p>
        <label class="admin-branding__field">
          <span class="admin-branding__label">WhatsApp</span>
          <input
            v-model="formWhatsappPhone"
            type="tel"
            class="admin-branding__input"
            :maxlength="WHATSAPP_PHONE_MAX_LEN"
            autocomplete="tel"
            placeholder="+584121234567"
            :disabled="isSavingWhatsapp || isSaving || isUploadingLogo"
          />
        </label>
        <p v-if="whatsappTooLong" class="admin-branding__validation" role="alert">
          El WhatsApp no puede superar {{ WHATSAPP_PHONE_MAX_LEN }} caracteres.
        </p>
        <div class="admin-branding__actions">
          <button
            type="button"
            class="admin-branding__btn"
            :disabled="!canSaveWhatsapp"
            @click="saveWhatsapp"
          >
            {{ isSavingWhatsapp ? 'Guardando…' : 'Guardar WhatsApp' }}
          </button>
        </div>
      </section>

      <section class="admin-branding__section">
        <h2 class="admin-branding__section-title">Logo</h2>
        <p class="admin-branding__hint">
          Subí una imagen; se envía como <code>multipart/form-data</code> con el campo <code>logo</code>.
          Formatos habituales: SVG o PNG con transparencia (también JPEG).
        </p>
        <p class="admin-branding__hint admin-branding__hint--logo-spec">
          {{ logoUploadHint }}
        </p>
        <input
          ref="logoFileInput"
          type="file"
          accept="image/*"
          class="admin-branding__file admin-branding__file--hidden"
          tabindex="-1"
          :disabled="isUploadingLogo || isSaving"
          @change="handleLogoFileChange"
        />
        <div class="admin-branding__logo-upload">
          <div v-if="displayLogoSrc" class="admin-branding__logo-block">
            <span class="admin-branding__logo-slot" aria-hidden="true">
              <img
                :src="displayLogoSrc"
                alt=""
                class="admin-branding__logo-img"
                decoding="async"
              />
            </span>
            <span class="admin-branding__logo-slot-label">
              Vista previa del espacio fijo (escritorio 200×48)
            </span>
          </div>
          <p v-else class="admin-branding__muted">No hay vista previa. Elegí un archivo para previsualizar.</p>
          <div class="admin-branding__logo-actions">
            <button
              type="button"
              class="admin-branding__btn admin-branding__btn--secondary"
              :disabled="isUploadingLogo || isSaving"
              @click="triggerLogoFilePicker"
            >
              Elegir imagen
            </button>
            <button
              type="button"
              class="admin-branding__btn"
              :disabled="!canUploadLogo"
              @click="uploadLogo"
            >
              {{ isUploadingLogo ? 'Subiendo…' : 'Guardar logo' }}
            </button>
          </div>
        </div>
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
        <StorefrontBrandingPreview
          :primary-color="formPrimary || DEFAULT_PRIMARY"
          :secondary-color="formSecondary || DEFAULT_SECONDARY"
          :accent-color="formAccent || DEFAULT_ACCENT"
          :logo-src="displayLogoSrc"
          :store-display-name="storeDisplayName"
        />
      </section>
    </template>
  </div>
</template>
