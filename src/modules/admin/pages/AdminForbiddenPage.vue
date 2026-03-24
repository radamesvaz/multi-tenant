<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../shared/store';
import './AdminForbiddenPage.css';

const router = useRouter();
const authStore = useAuthStore();
const tenantSlug = authStore.getActiveAdminTenantSlug();

function logout() {
  const slug = tenantSlug;
  authStore.clearToken(slug);
  router.push({ name: 'admin-login', params: { tenantSlug: slug } });
}
</script>

<template>
  <main class="admin-forbidden">
    <div class="admin-forbidden__card">
      <h1>Acceso denegado</h1>
      <p>No tenés permisos de administrador para esta tienda.</p>
      <button type="button" class="admin-forbidden__btn" @click="logout">Cerrar sesión</button>
      <RouterLink class="admin-forbidden__link" :to="{ name: 'public-home', params: { tenantSlug } }">
        Volver a la tienda
      </RouterLink>
    </div>
  </main>
</template>
