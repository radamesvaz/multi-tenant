<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import './AdminLayout.css';

const isMobileNavOpen = ref(false);
const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    isMobileNavOpen.value = false;
  },
);
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar" :class="{ 'admin-layout__sidebar--open': isMobileNavOpen }">
      <div class="admin-layout__sidebar-head">
        <h2>Admin</h2>
        <button type="button" class="admin-layout__close-nav" @click="isMobileNavOpen = false">
          Cerrar
        </button>
      </div>
      <nav class="admin-layout__nav">
        <RouterLink :to="{ name: 'admin-orders' }">Órdenes</RouterLink>
        <RouterLink :to="{ name: 'admin-products' }">Productos</RouterLink>
        <RouterLink :to="{ name: 'admin-branding' }">Personalización</RouterLink>
      </nav>
    </aside>
    <div v-if="isMobileNavOpen" class="admin-layout__backdrop" @click="isMobileNavOpen = false" />
    <section class="admin-layout__main">
      <header class="admin-layout__topbar">
        <button type="button" class="admin-layout__menu-btn" @click="isMobileNavOpen = true">
          Menú
        </button>
        <h1>Admin panel</h1>
      </header>
      <main class="admin-layout__content">
        <RouterView />
      </main>
    </section>
  </div>
</template>

