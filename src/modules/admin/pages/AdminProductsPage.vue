<script setup lang="ts">
import { onMounted } from 'vue';
import { useAdminProductsStore } from '../store';
import './AdminProductsPage.css';

const productsStore = useAdminProductsStore();

onMounted(() => {
  productsStore.loadProducts();
});

function formatPrice(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
</script>

<template>
  <div class="admin-products">
    <header class="admin-products__header">
      <h1>Productos</h1>
      <p class="admin-products__subtitle">
        Catálogo del tenant activo (<code>GET /t/&lt;slug&gt;/products</code> con JWT).
      </p>
    </header>

    <div v-if="productsStore.isLoading" class="admin-products__state">Cargando…</div>
    <div v-else-if="productsStore.error" class="admin-products__state admin-products__state--error" role="alert">
      {{ productsStore.error }}
    </div>
    <div v-else-if="productsStore.products.length === 0" class="admin-products__state">
      No hay productos para este tenant.
    </div>

    <div v-else class="admin-products__table-wrap">
      <table class="admin-products__table">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Precio</th>
            <th scope="col">Inventario</th>
            <th scope="col">Estado</th>
            <th scope="col">Disponible</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in productsStore.products" :key="p.id_product">
            <td class="admin-products__name">{{ p.name }}</td>
            <td>{{ formatPrice(p.price) }}</td>
            <td>{{ p.stock ?? '—' }}</td>
            <td><span class="admin-products__badge">{{ p.status }}</span></td>
            <td>{{ p.available ? 'Sí' : 'No' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
