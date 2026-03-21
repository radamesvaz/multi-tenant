<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="admin-layout">
    <header class="admin-layout__header">
      <h1>Admin layout</h1>
    </header>
    <main class="admin-layout__content">
      <RouterView />
    </main>
  </div>
</template>

