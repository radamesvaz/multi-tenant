<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import './AdminLayout.css';
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar">
      <h2>Admin</h2>
      <nav class="admin-layout__nav">
        <RouterLink :to="{ name: 'admin-dashboard' }">Dashboard</RouterLink>
        <RouterLink :to="{ name: 'admin-products' }">Productos</RouterLink>
      </nav>
    </aside>
    <section class="admin-layout__main">
      <header class="admin-layout__topbar">
        <h1>Admin panel</h1>
      </header>
      <main class="admin-layout__content">
        <RouterView />
      </main>
    </section>
  </div>
</template>

