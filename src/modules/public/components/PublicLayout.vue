<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="public-layout">
    <header class="public-layout__header">
      <h1>Storefront</h1>
    </header>

    <main class="public-layout__content">
      <RouterView />
    </main>

    <footer class="public-layout__footer">
      <small>Public storefront layout</small>
    </footer>
  </div>
</template>

