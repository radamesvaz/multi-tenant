<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { InvitationApiError } from '../../../core/auth/invitationsApi';
import { redirectOnSubscriptionCanceled } from '../../../core/auth/redirectOnSubscriptionCanceled';
import { SubscriptionCanceledError } from '../../../core/auth/subscriptionApi';
import { INVITATION_ERROR_CODES } from '../../../core/models';
import { invitationService } from '../../../core/services';
import { validatePassword } from '../../../core/validation/password';
import { useAuthStore, useSubscriptionStore } from '../../../shared/store';
import './AdminLoginPage.css';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();

const name = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const retryBlockedUntil = ref<number | null>(null);

const tenantSlug = computed(() => {
  const slug = route.params.tenantSlug;
  return typeof slug === 'string' ? slug.trim() : '';
});

const inviteToken = computed(() => {
  const raw = route.query.token;
  return typeof raw === 'string' ? raw.trim() : '';
});

const hasValidToken = computed(() => inviteToken.value.length > 0);

const isRetryBlocked = computed(
  () => retryBlockedUntil.value != null && Date.now() < retryBlockedUntil.value,
);

const redirectTarget = computed(() => {
  const raw = route.query.redirect;
  return typeof raw === 'string' && raw.startsWith('/') ? raw : null;
});

const loginRoute = computed(() => ({
  name: 'admin-login' as const,
  params: { tenantSlug: tenantSlug.value },
}));

const passwordHints = [
  'Al menos 8 caracteres',
  'Al menos una mayúscula y una minúscula',
  'Al menos un dígito',
  'Al menos un carácter especial',
];

function tokenErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case INVITATION_ERROR_CODES.EXPIRED_TOKEN:
      return 'El enlace caducó. Pedile al administrador que envíe una nueva invitación.';
    case INVITATION_ERROR_CODES.TOKEN_ALREADY_CONSUMED:
      return 'Este enlace ya fue utilizado. Iniciá sesión con tu cuenta.';
    case INVITATION_ERROR_CODES.INVALID_TOKEN:
    case INVITATION_ERROR_CODES.TOKEN_REVOKED:
      return 'El enlace no es válido. Pedile al administrador que envíe una nueva invitación.';
    default:
      return null;
  }
}

function invitationErrorMessage(err: InvitationApiError): string {
  const tokenMsg = tokenErrorMessage(err.errorCode);
  if (tokenMsg) return tokenMsg;

  if (err.errorCode === INVITATION_ERROR_CODES.EMAIL_ALREADY_EXISTS) {
    return 'Ese email ya tiene cuenta en esta tienda. Iniciá sesión con tu contraseña.';
  }

  if (err.errorCode === INVITATION_ERROR_CODES.WEAK_PASSWORD) {
    return err.message;
  }

  return err.message;
}

async function onSubmit() {
  errorMessage.value = null;

  if (!hasValidToken.value) {
    errorMessage.value = 'El enlace no es válido. Pedile al administrador que envíe una nueva invitación.';
    return;
  }

  if (isRetryBlocked.value) {
    return;
  }

  const slug = tenantSlug.value;
  if (!slug) {
    errorMessage.value = 'No se pudo determinar la tienda.';
    return;
  }

  const trimmedName = name.value.trim();
  if (!trimmedName) {
    errorMessage.value = 'El nombre es obligatorio.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }

  const validation = validatePassword(password.value);
  if (!validation.valid) {
    errorMessage.value = validation.reasons.join('. ');
    return;
  }

  const trimmedPhone = phone.value.trim();
  const payload = {
    token: inviteToken.value,
    name: trimmedName,
    password: password.value,
    ...(trimmedPhone.length > 0 ? { phone: trimmedPhone } : {}),
  };

  isSubmitting.value = true;
  subscriptionStore.clearSubscription();

  try {
    const { token } = await invitationService.acceptInvitation(slug, payload);
    authStore.setToken(slug, token);

    if (!authStore.isAdminForTenant(slug)) {
      authStore.clearToken(slug);
      subscriptionStore.clearSubscription();
      await router.replace({ name: 'admin-forbidden' });
      return;
    }

    subscriptionStore.clearSubscription();
    try {
      await subscriptionStore.hydrateFromToken(token);
    } catch (err) {
      if (err instanceof SubscriptionCanceledError) {
        authStore.clearToken(slug);
        subscriptionStore.clearSubscription();
        await redirectOnSubscriptionCanceled(slug);
        return;
      }
    }

    if (redirectTarget.value) {
      await router.replace(redirectTarget.value);
    } else {
      await router.replace({ name: 'admin-orders' });
    }
  } catch (err) {
    if (err instanceof InvitationApiError) {
      errorMessage.value = invitationErrorMessage(err);
      if (err.status === 429 && err.retryAfter != null) {
        retryBlockedUntil.value = Date.now() + err.retryAfter * 1000;
      }
    } else {
      errorMessage.value =
        err instanceof Error ? err.message : 'No se pudo completar la invitación.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="admin-login">
    <div class="admin-login__card">
      <h1>Aceptar invitación</h1>
      <p class="admin-login__hint">
        Completa tus datos para unirte al equipo de administración de la tienda.
      </p>

      <p v-if="tenantSlug" class="admin-login__store" aria-live="polite">
        Tienda: <strong>{{ tenantSlug }}</strong>
      </p>

      <p v-if="!hasValidToken" class="admin-login__error" role="alert">
        El enlace no es válido. Pedile al administrador que envíe una nueva invitación.
      </p>

      <form v-else class="admin-login__form" @submit.prevent="onSubmit">
        <label class="admin-login__field">
          <span>Nombre</span>
          <input
            v-model="name"
            type="text"
            name="name"
            autocomplete="name"
            required
            :disabled="isSubmitting"
          />
        </label>

        <label class="admin-login__field">
          <span>Teléfono <em class="admin-login__optional">(opcional)</em></span>
          <input
            v-model="phone"
            type="tel"
            name="phone"
            autocomplete="tel"
            :disabled="isSubmitting"
          />
        </label>

        <ul class="admin-login__requirements">
          <li v-for="hint in passwordHints" :key="hint">{{ hint }}</li>
        </ul>

        <label class="admin-login__field">
          <span>Contraseña</span>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="new-password"
            required
            :disabled="isSubmitting"
          />
        </label>

        <label class="admin-login__field">
          <span>Confirmar contraseña</span>
          <input
            v-model="confirmPassword"
            type="password"
            name="confirm_password"
            autocomplete="new-password"
            required
            :disabled="isSubmitting"
          />
        </label>

        <p v-if="errorMessage" class="admin-login__error" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="admin-login__submit"
          :disabled="isSubmitting || isRetryBlocked"
        >
          {{ isSubmitting ? 'Creando cuenta…' : 'Aceptar invitación' }}
        </button>
      </form>

      <p class="admin-login__link-row">
        <RouterLink class="admin-login__link" :to="loginRoute">
          Ya tengo cuenta — iniciar sesión
        </RouterLink>
      </p>
    </div>
  </main>
</template>
