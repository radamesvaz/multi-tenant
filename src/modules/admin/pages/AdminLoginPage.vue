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
/** Tenant slug from URL `/:tenantSlug/admin-login`, or manual fallback. */
const tenantSlug = ref(envConfig.defaultTenantSlug);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const slugFromRoute = computed(() =>
  typeof route.params.tenantSlug === 'string' && route.params.tenantSlug.length > 0
    ? route.params.tenantSlug
    : '',
);

const hasSlugInUrl = computed(() => slugFromRoute.value.length > 0);

watch(
  slugFromRoute,
  (slug) => {
    if (slug) tenantSlug.value = slug;
  },
  { immediate: true },
);

const redirectTarget = computed(() => {
  const raw = route.query.redirect;
  return typeof raw === 'string' && raw.startsWith('/') ? raw : null;
});

async function onSubmit() {
  errorMessage.value = null;
  const slug = tenantSlug.value.trim();
  if (!slug) {
    errorMessage.value = 'Indicá el identificador de la tienda.';
    return;
  }

  isSubmitting.value = true;
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
      <p v-if="hasSlugInUrl" class="admin-login__hint">
        Ingresá con tu cuenta de administrador. El servidor usa <code>POST /t/&lt;slug&gt;/auth/login</code> con email y contraseña.
      </p>
      <p v-else class="admin-login__hint">
        Indicá el slug de la tienda o usá el enlace con la forma <code>/&lt;slug&gt;/admin-login</code>.
      </p>

      <p v-if="hasSlugInUrl" class="admin-login__store" aria-live="polite">
        Tienda: <strong>{{ slugFromRoute }}</strong>
      </p>

      <form class="admin-login__form" @submit.prevent="onSubmit">
        <label v-if="!hasSlugInUrl" class="admin-login__field">
          <span>Tienda (slug)</span>
          <input v-model="tenantSlug" type="text" name="tenantSlug" autocomplete="organization" required />
        </label>
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
      </form>
    </div>
  </main>
</template>
