<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PasswordResetApiError } from '../../../core/auth/passwordResetApi';
import { authService } from '../../../core/services';
import { validatePassword } from '../../../core/validation/password';
import './AdminLoginPage.css';

const route = useRoute();
const router = useRouter();

const newPassword = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const retryBlockedUntil = ref<number | null>(null);

const tenantSlug = computed(() => {
  const slug = route.params.tenantSlug;
  return typeof slug === 'string' ? slug : '';
});

const resetToken = computed(() => {
  const raw = route.query.token;
  return typeof raw === 'string' ? raw.trim() : '';
});

const hasValidToken = computed(() => resetToken.value.length > 0);

const isRetryBlocked = computed(
  () => retryBlockedUntil.value != null && Date.now() < retryBlockedUntil.value,
);

const passwordHints = [
  'Al menos 8 caracteres',
  'Al menos una mayúscula y una minúscula',
  'Al menos un dígito',
  'Al menos un carácter especial',
];

function forgotRoute() {
  return {
    name: 'admin-password-forgot' as const,
    params: { tenantSlug: tenantSlug.value },
  };
}

function tokenErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case 'expired_token':
      return 'El enlace caducó. Solicitá uno nuevo.';
    case 'token_already_consumed':
      return 'Este enlace ya fue utilizado. Iniciá sesión o solicitá uno nuevo.';
    case 'invalid_token':
    case 'token_revoked':
      return 'El enlace no es válido. Solicitá uno nuevo.';
    default:
      return null;
  }
}

async function onSubmit() {
  errorMessage.value = null;

  if (!hasValidToken.value) {
    errorMessage.value = 'El enlace no es válido. Solicitá uno nuevo desde recuperar contraseña.';
    return;
  }

  if (isRetryBlocked.value) {
    return;
  }

  const slug = tenantSlug.value.trim();
  if (!slug) {
    errorMessage.value = 'No se pudo determinar la tienda.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }

  const validation = validatePassword(newPassword.value);
  if (!validation.valid) {
    errorMessage.value = validation.reasons.join('. ');
    return;
  }

  isSubmitting.value = true;
  try {
    await authService.resetPassword(slug, {
      token: resetToken.value,
      new_password: newPassword.value,
    });

    await router.replace({
      name: 'admin-login',
      params: { tenantSlug: slug },
      query: { passwordReset: '1' },
    });
  } catch (err) {
    if (err instanceof PasswordResetApiError) {
      const tokenMsg = tokenErrorMessage(err.errorCode);
      errorMessage.value = tokenMsg ?? err.message;
      if (err.status === 429 && err.retryAfter != null) {
        retryBlockedUntil.value = Date.now() + err.retryAfter * 1000;
      }
    } else {
      errorMessage.value =
        err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.';
    }
  } finally {
    isSubmitting.value = false;
  }
}

function goToForgot() {
  void router.push(forgotRoute());
}
</script>

<template>
  <main class="admin-login">
    <div class="admin-login__card">
      <h1>Nueva contraseña</h1>
      <p class="admin-login__hint">
        Elegí una contraseña segura. El enlace del correo caduca en aproximadamente 1 hora.
      </p>

      <p v-if="tenantSlug" class="admin-login__store" aria-live="polite">
        Tienda: <strong>{{ tenantSlug }}</strong>
      </p>

      <p v-if="!hasValidToken" class="admin-login__error" role="alert">
        El enlace no es válido. Solicitá uno nuevo desde recuperar contraseña.
      </p>

      <form v-else class="admin-login__form" @submit.prevent="onSubmit">
        <ul class="admin-login__requirements">
          <li v-for="hint in passwordHints" :key="hint">{{ hint }}</li>
        </ul>

        <label class="admin-login__field">
          <span>Nueva contraseña</span>
          <input
            v-model="newPassword"
            type="password"
            name="new_password"
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
          {{ isSubmitting ? 'Guardando…' : 'Restablecer contraseña' }}
        </button>
      </form>

      <p class="admin-login__link-row">
        <button type="button" class="admin-login__link" @click="goToForgot">
          Solicitar un nuevo enlace
        </button>
      </p>
    </div>
  </main>
</template>
