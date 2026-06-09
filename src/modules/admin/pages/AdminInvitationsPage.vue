<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { InvitationApiError } from '../../../core/auth/invitationsApi';
import { SubscriptionCanceledError } from '../../../core/auth/subscriptionApi';
import { INVITATION_ERROR_CODES } from '../../../core/models';
import { invitationService } from '../../../core/services';
import { isValidEmail } from '../../../core/validation/email';
import { AppSnackbar } from '../../../shared/components';
import { lastInvitationStorageKey } from '../../../shared/constants/storageKeys';
import { useAuthStore } from '../../../shared/store';
import './AdminInvitationsPage.css';

type LastInvitationState = {
  invitationId: number;
  email: string;
  expiresAt: string;
};

const authStore = useAuthStore();

const email = ref('');
const isSubmitting = ref(false);
const isResending = ref(false);
const isRevoking = ref(false);
const errorMessage = ref<string | null>(null);
const retryBlockedUntil = ref<number | null>(null);
const lastInvitation = ref<LastInvitationState | null>(null);
const snackbarOpen = ref(false);
const snackbarMessage = ref('');

const tenantSlug = computed(() => authStore.getActiveAdminTenantSlug());

const isBusy = computed(() => isSubmitting.value || isResending.value || isRevoking.value);

const isRetryBlocked = computed(
  () => retryBlockedUntil.value != null && Date.now() < retryBlockedUntil.value,
);

const formattedExpiry = computed(() => {
  const iso = lastInvitation.value?.expiresAt;
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
});

function showSnackbar(message: string) {
  snackbarMessage.value = message;
  snackbarOpen.value = true;
}

function persistLastInvitation(state: LastInvitationState) {
  lastInvitation.value = state;
  sessionStorage.setItem(lastInvitationStorageKey(tenantSlug.value), JSON.stringify(state));
}

function clearLastInvitation() {
  lastInvitation.value = null;
  sessionStorage.removeItem(lastInvitationStorageKey(tenantSlug.value));
}

function loadLastInvitation() {
  const raw = sessionStorage.getItem(lastInvitationStorageKey(tenantSlug.value));
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<LastInvitationState>;
    if (
      typeof parsed.invitationId === 'number' &&
      typeof parsed.email === 'string' &&
      typeof parsed.expiresAt === 'string'
    ) {
      lastInvitation.value = {
        invitationId: parsed.invitationId,
        email: parsed.email,
        expiresAt: parsed.expiresAt,
      };
    }
  } catch {
    sessionStorage.removeItem(lastInvitationStorageKey(tenantSlug.value));
  }
}

function getSessionToken(): string | null {
  const slug = tenantSlug.value;
  const token = authStore.getToken(slug);
  if (!token) {
    errorMessage.value = 'La sesión expiró. Volvé a iniciar sesión.';
    return null;
  }
  return token;
}

function tokenMutationErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case INVITATION_ERROR_CODES.EXPIRED_TOKEN:
    case INVITATION_ERROR_CODES.TOKEN_ALREADY_CONSUMED:
    case INVITATION_ERROR_CODES.INVALID_TOKEN:
    case INVITATION_ERROR_CODES.TOKEN_REVOKED:
      return 'Esta invitación ya no es válida. Enviá una nueva invitación.';
    default:
      return null;
  }
}

function invitationMutationErrorMessage(err: InvitationApiError): string {
  const tokenMsg = tokenMutationErrorMessage(err.errorCode);
  if (tokenMsg) return tokenMsg;

  if (err.errorCode === INVITATION_ERROR_CODES.EMAIL_ALREADY_EXISTS) {
    return 'Ese email ya tiene cuenta en esta tienda.';
  }

  if (err.errorCode === INVITATION_ERROR_CODES.SERVICE_UNCONFIGURED) {
    return 'El envío de correo no está disponible. Contactá a soporte.';
  }

  return err.message;
}

function handleMutationError(err: unknown) {
  if (err instanceof SubscriptionCanceledError) {
    return;
  }
  if (err instanceof InvitationApiError) {
    errorMessage.value = invitationMutationErrorMessage(err);
    if (err.status === 429 && err.retryAfter != null) {
      retryBlockedUntil.value = Date.now() + err.retryAfter * 1000;
    }
    return;
  }
  errorMessage.value = err instanceof Error ? err.message : 'No se pudo completar la acción.';
}

async function onSubmit() {
  errorMessage.value = null;

  if (isRetryBlocked.value || isBusy.value) {
    return;
  }

  const trimmedEmail = email.value.trim();
  if (!isValidEmail(trimmedEmail)) {
    errorMessage.value = 'Ingresá un email válido.';
    return;
  }

  const token = getSessionToken();
  if (!token) return;

  isSubmitting.value = true;
  try {
    const response = await invitationService.createInvitation(token, trimmedEmail);
    persistLastInvitation({
      invitationId: response.id,
      email: response.email,
      expiresAt: response.expires_at,
    });
    showSnackbar(response.message || `Invitación enviada a ${response.email}`);
    email.value = '';
  } catch (err) {
    handleMutationError(err);
  } finally {
    isSubmitting.value = false;
  }
}

async function onResend() {
  errorMessage.value = null;

  if (isRetryBlocked.value || isBusy.value || !lastInvitation.value) {
    return;
  }

  const token = getSessionToken();
  if (!token) return;

  isResending.value = true;
  try {
    const response = await invitationService.resendInvitation(
      token,
      lastInvitation.value.invitationId,
    );
    persistLastInvitation({
      invitationId: response.id,
      email: response.email,
      expiresAt: response.expires_at,
    });
    showSnackbar(
      `${response.message || 'Invitación reenviada.'} El enlace anterior del correo ya no sirve.`,
    );
  } catch (err) {
    handleMutationError(err);
  } finally {
    isResending.value = false;
  }
}

async function onRevoke() {
  errorMessage.value = null;

  if (isBusy.value || !lastInvitation.value) {
    return;
  }

  const confirmed = window.confirm(
    '¿Revocar la invitación? El enlace del correo dejará de funcionar.',
  );
  if (!confirmed) return;

  const token = getSessionToken();
  if (!token) return;

  isRevoking.value = true;
  try {
    const response = await invitationService.revokeInvitation(
      token,
      lastInvitation.value.invitationId,
    );
    clearLastInvitation();
    showSnackbar(response.message || 'Invitación revocada correctamente.');
  } catch (err) {
    handleMutationError(err);
  } finally {
    isRevoking.value = false;
  }
}

onMounted(loadLastInvitation);
</script>

<template>
  <div class="admin-invitations">
    <header class="admin-invitations__header">
      <h1>Invitar usuario</h1>
      <p class="admin-invitations__subtitle">
        Enviá una invitación por correo para que otra persona administre esta tienda.
      </p>
    </header>

    <form class="admin-invitations__form" @submit.prevent="onSubmit">
      <label class="admin-invitations__field">
        <span>Email del invitado</span>
        <input
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          :disabled="isBusy"
        />
      </label>

      <p v-if="errorMessage" class="admin-invitations__error" role="alert">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="admin-invitations__submit"
        :disabled="isBusy || isRetryBlocked"
      >
        {{ isSubmitting ? 'Enviando…' : 'Enviar invitación' }}
      </button>
    </form>

    <section v-if="lastInvitation" class="admin-invitations__last" aria-live="polite">
      <h2 class="admin-invitations__last-title">Última invitación enviada</h2>
      <p class="admin-invitations__last-detail">
        Email: <strong>{{ lastInvitation.email }}</strong>
      </p>
      <p class="admin-invitations__last-detail">
        ID: <strong>{{ lastInvitation.invitationId }}</strong>
      </p>
      <p v-if="formattedExpiry" class="admin-invitations__last-detail">
        Vence: <strong>{{ formattedExpiry }} (UTC)</strong>
      </p>
      <p class="admin-invitations__last-hint">
        Solo podés gestionar la última invitación enviada desde este panel.
      </p>

      <div class="admin-invitations__last-actions">
        <button
          type="button"
          class="admin-invitations__action"
          :disabled="isBusy || isRetryBlocked"
          @click="onResend"
        >
          {{ isResending ? 'Reenviando…' : 'Reenviar' }}
        </button>
        <button
          type="button"
          class="admin-invitations__action admin-invitations__action--danger"
          :disabled="isBusy"
          @click="onRevoke"
        >
          {{ isRevoking ? 'Revocando…' : 'Revocar' }}
        </button>
      </div>
    </section>

    <AppSnackbar v-model:visible="snackbarOpen" :message="snackbarMessage" />
  </div>
</template>
