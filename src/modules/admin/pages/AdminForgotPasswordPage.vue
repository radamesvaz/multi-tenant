<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  PasswordResetApiError,
} from '../../../core/auth/passwordResetApi';
import { authService } from '../../../core/services';
import { isValidEmail } from '../../../core/validation/email';
import './AdminLoginPage.css';

const route = useRoute();
const router = useRouter();

const email = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const retryBlockedUntil = ref<number | null>(null);

const tenantSlug = computed(() => {
  const slug = route.params.tenantSlug;
  return typeof slug === 'string' ? slug : '';
});

const isRetryBlocked = computed(
  () => retryBlockedUntil.value != null && Date.now() < retryBlockedUntil.value,
);

function loginRoute() {
  return {
    name: 'admin-login' as const,
    params: { tenantSlug: tenantSlug.value },
    query: email.value.trim() ? { email: email.value.trim() } : undefined,
  };
}

async function onSubmit() {
  errorMessage.value = null;
  successMessage.value = null;

  if (isRetryBlocked.value) {
    return;
  }

  const slug = tenantSlug.value.trim();
  if (!slug) {
    errorMessage.value = 'No se pudo determinar la tienda.';
    return;
  }

  const trimmedEmail = email.value.trim();
  if (!isValidEmail(trimmedEmail)) {
    errorMessage.value = 'Ingresá un email válido.';
    return;
  }

  isSubmitting.value = true;
  const minDelay = new Promise((resolve) => setTimeout(resolve, 400));

  try {
    await Promise.all([
      authService.forgotPassword(slug, { email: trimmedEmail }),
      minDelay,
    ]);
    successMessage.value = FORGOT_PASSWORD_SUCCESS_MESSAGE;
  } catch (err) {
    if (err instanceof PasswordResetApiError) {
      errorMessage.value = err.message;
      if (err.status === 429 && err.retryAfter != null) {
        retryBlockedUntil.value = Date.now() + err.retryAfter * 1000;
      }
    } else {
      errorMessage.value =
        err instanceof Error ? err.message : 'No se pudo procesar la solicitud.';
    }
  } finally {
    isSubmitting.value = false;
  }
}

function goToLogin() {
  void router.push(loginRoute());
}
</script>

<template>
  <main class="admin-login">
    <div class="admin-login__card">
      <h1>Recuperar contraseña</h1>
      <p class="admin-login__hint">
        Ingresá el email de tu cuenta de administrador. Si existe en esta tienda, recibirás un enlace
        por correo (válido por aproximadamente 1 hora).
      </p>

      <p v-if="successMessage" class="admin-login__success" role="status">
        {{ successMessage }}
      </p>

      <form v-if="!successMessage" class="admin-login__form" @submit.prevent="onSubmit">
        <label class="admin-login__field">
          <span>Email</span>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
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
          {{ isSubmitting ? 'Enviando…' : 'Enviar instrucciones' }}
        </button>
      </form>

      <p class="admin-login__link-row">
        <button type="button" class="admin-login__link" @click="goToLogin">
          Volver al inicio de sesión
        </button>
      </p>
    </div>
  </main>
</template>
