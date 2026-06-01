<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { envConfig } from '../../../core/config';
import { authService } from '../../../core/services';
import { useAuthStore } from '../../../shared/store';
import './AdminLoginPage.css';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const tenantSlug = computed(() => {
  const slug = route.params.tenantSlug;
  if (typeof slug === 'string' && slug.trim().length > 0) {
    return slug.trim();
  }
  return envConfig.defaultTenantSlug;
});

watch(
  () => route.query.email,
  (value) => {
    if (typeof value === 'string' && value.length > 0) {
      email.value = value;
    }
  },
  { immediate: true },
);

const passwordResetSuccess = computed(() => route.query.passwordReset === '1');

const forgotPasswordTo = computed(() => ({
  name: 'admin-password-forgot' as const,
  params: { tenantSlug: tenantSlug.value },
}));

const redirectTarget = computed(() => {
  const raw = route.query.redirect;
  return typeof raw === 'string' && raw.startsWith('/') ? raw : null;
});

async function onSubmit() {
  errorMessage.value = null;
  isSubmitting.value = true;
  const slug = tenantSlug.value;
  try {
    const { token } = await authService.loginTenant(slug, {
      email: email.value.trim(),
      password: password.value,
    });
    authStore.setToken(slug, token);

    if (!authStore.isAdminForTenant(slug)) {
      authStore.clearToken(slug);
      await router.replace({ name: 'admin-forbidden' });
      return;
    }

    await router.replace(redirectTarget.value ?? { name: 'admin-orders' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
    errorMessage.value = message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="admin-login">
    <div class="admin-login__card">
      <h1>Admin</h1>
      <p class="admin-login__hint">Ingresá con tu cuenta de administrador.</p>

      <p v-if="passwordResetSuccess" class="admin-login__success" role="status">
        Contraseña actualizada. Iniciá sesión con tu nueva contraseña.
      </p>

      <form class="admin-login__form" @submit.prevent="onSubmit">
        <label class="admin-login__field">
          <span>Email</span>
          <input v-model="email" type="email" name="email" autocomplete="username" required />
        </label>
        <label class="admin-login__field">
          <span>Contraseña</span>
          <input v-model="password" type="password" name="password" autocomplete="current-password" required />
        </label>

        <p v-if="errorMessage" class="admin-login__error" role="alert">
          {{ errorMessage }}
        </p>

        <button type="submit" class="admin-login__submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Entrando…' : 'Entrar' }}
        </button>

        <p class="admin-login__link-row">
          <RouterLink class="admin-login__link" :to="forgotPasswordTo">
            ¿Olvidaste tu contraseña?
          </RouterLink>
        </p>
      </form>
    </div>
  </main>
</template>
