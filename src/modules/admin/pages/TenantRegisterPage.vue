<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { redirectOnSubscriptionCanceled } from '../../../core/auth/redirectOnSubscriptionCanceled';
import { SubscriptionCanceledError } from '../../../core/auth/subscriptionApi';
import { TenantSignupApiError } from '../../../core/auth/tenantSignupApi';
import { tenantSignupService } from '../../../core/services';
import { isValidEmail } from '../../../core/validation/email';
import { validatePassword } from '../../../core/validation/password';
import { useAuthStore, useSubscriptionStore } from '../../../shared/store';
import './AdminLoginPage.css';

defineOptions({ name: 'TenantRegisterPage' });

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();

const tenantName = ref('');
const adminName = ref('');
const email = ref('');
const phone = ref('');
const password = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const oneTimeCode = computed(() => {
  const raw = route.query.code;
  return typeof raw === 'string' ? raw.trim() : '';
});

const hasValidCode = computed(() => oneTimeCode.value.length > 0);

const passwordHints = [
  'Al menos 8 caracteres',
  'Al menos una mayúscula y una minúscula',
  'Al menos un dígito',
  'Al menos un carácter especial',
];

function tenantRegisterErrorMessage(err: TenantSignupApiError): string {
  const body = err.message.toLowerCase();

  if (err.status === 422 || body.includes('one-time code') || body.includes('one time code')) {
    return 'El enlace caducó o ya fue utilizado. Pedí un nuevo acceso.';
  }

  if (err.status === 409) {
    if (body.includes('slug')) {
      return 'Ya existe un negocio con un nombre similar. Probá con otro nombre.';
    }
    if (body.includes('email')) {
      return 'Ese email ya tiene cuenta en esta tienda.';
    }
    return err.message || 'Ya existe un registro con esos datos.';
  }

  if (err.status === 400) {
    return err.message || 'Revisá los datos del formulario.';
  }

  return err.message || 'No se pudo registrar el negocio. Intentá de nuevo.';
}

async function onSubmit() {
  errorMessage.value = null;

  if (!hasValidCode.value) {
    errorMessage.value = 'El enlace no es válido.';
    return;
  }

  const trimmedTenantName = tenantName.value.trim();
  if (!trimmedTenantName) {
    errorMessage.value = 'El nombre del negocio es obligatorio.';
    return;
  }

  const trimmedAdminName = adminName.value.trim();
  if (!trimmedAdminName) {
    errorMessage.value = 'El nombre del administrador es obligatorio.';
    return;
  }

  const trimmedEmail = email.value.trim();
  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    errorMessage.value = 'Ingresá un email válido.';
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
    tenant_name: trimmedTenantName,
    admin_name: trimmedAdminName,
    email: trimmedEmail,
    password: password.value,
    one_time_code: oneTimeCode.value,
    ...(trimmedPhone.length > 0 ? { phone: trimmedPhone } : {}),
  };

  isSubmitting.value = true;
  subscriptionStore.clearSubscription();

  try {
    const response = await tenantSignupService.registerTenant(payload);
    const slug = response.tenant_slug;
    authStore.setToken(slug, response.token);

    if (!authStore.isAdminForTenant(slug)) {
      authStore.clearToken(slug);
      subscriptionStore.clearSubscription();
      await router.replace({ name: 'admin-forbidden' });
      return;
    }

    subscriptionStore.clearSubscription();
    try {
      await subscriptionStore.hydrateFromToken(response.token);
    } catch (err) {
      if (err instanceof SubscriptionCanceledError) {
        authStore.clearToken(slug);
        subscriptionStore.clearSubscription();
        await redirectOnSubscriptionCanceled(slug);
        return;
      }
    }

    await router.replace({ name: 'admin-orders' });
  } catch (err) {
    if (err instanceof TenantSignupApiError) {
      errorMessage.value = tenantRegisterErrorMessage(err);
    } else {
      errorMessage.value =
        err instanceof Error ? err.message : 'No se pudo registrar el negocio.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="admin-login">
    <div class="admin-login__card">
      <h1>Registrar tu negocio</h1>
      <p class="admin-login__hint">
        Completá los datos de tu tienda y de la cuenta de administración.
      </p>

      <p v-if="!hasValidCode" class="admin-login__error" role="alert">
        El enlace no es válido.
      </p>

      <form v-else class="admin-login__form" @submit.prevent="onSubmit">
        <label class="admin-login__field">
          <span>Nombre del negocio</span>
          <input
            v-model="tenantName"
            type="text"
            name="tenant_name"
            autocomplete="organization"
            required
            :disabled="isSubmitting"
          />
        </label>

        <label class="admin-login__field">
          <span>Nombre del administrador</span>
          <input
            v-model="adminName"
            type="text"
            name="admin_name"
            autocomplete="name"
            required
            :disabled="isSubmitting"
          />
        </label>

        <label class="admin-login__field">
          <span>Email del administrador</span>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
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

        <button type="submit" class="admin-login__submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Registrando…' : 'Crear negocio' }}
        </button>
      </form>
    </div>
  </main>
</template>
