<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { Order } from '../../../core/models';
import { osmEmbedUrl, resolveLatLngForMapsUrl } from '../../../core/utils';
import { useOrdersStore } from '../store';
import './AdminOrdersPage.css';

const ordersStore = useOrdersStore();
const selectedOrder = ref<Order | null>(null);

/** OpenStreetMap preview (no Google scripts) after resolving coordinates from URL. */
const mapPreviewSrc = ref<string | null>(null);
const mapPreviewLoading = ref(false);
const mapPreviewFailed = ref(false);
let mapPreviewAbort: AbortController | null = null;

let removeKeyListener: (() => void) | undefined;
onMounted(() => {
  ordersStore.loadOrders();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  window.addEventListener('keydown', onKey);
  removeKeyListener = () => window.removeEventListener('keydown', onKey);
});

watch(selectedOrder, async (order) => {
  document.body.style.overflow = order ? 'hidden' : '';

  mapPreviewAbort?.abort();
  mapPreviewAbort = null;
  mapPreviewSrc.value = null;
  mapPreviewFailed.value = false;
  mapPreviewLoading.value = false;

  const url = order?.delivery_direction?.trim();
  if (!url) {
    return;
  }

  mapPreviewLoading.value = true;
  const ac = new AbortController();
  mapPreviewAbort = ac;
  try {
    const coords = await resolveLatLngForMapsUrl(url, ac.signal);
    if (ac.signal.aborted) {
      return;
    }
    if (coords) {
      mapPreviewSrc.value = osmEmbedUrl(coords.lat, coords.lng);
    } else {
      mapPreviewFailed.value = true;
    }
  } catch {
    if (!ac.signal.aborted) {
      mapPreviewFailed.value = true;
    }
  } finally {
    if (!ac.signal.aborted) {
      mapPreviewLoading.value = false;
    }
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
  removeKeyListener?.();
});

function openModal(order: Order) {
  selectedOrder.value = order;
}

function closeModal() {
  selectedOrder.value = null;
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatDateOrDash(iso: string | null) {
  if (!iso) return '—';
  return formatDate(iso);
}

function lineSubtotal(unit: number, qty: number) {
  return formatMoney(unit * qty);
}
</script>

<template>
  <div class="admin-orders">
    <header class="admin-orders__header">
      <h1>Órdenes</h1>
      <p class="admin-orders__subtitle">
        Pedidos del tenant según el JWT (<code>GET /auth/orders</code>, <code>Authorization: Bearer</code>). Hacé clic
        en una fila para ver el detalle completo.
      </p>
    </header>

    <div v-if="ordersStore.isLoading" class="admin-orders__state">Cargando…</div>
    <div v-else-if="ordersStore.error" class="admin-orders__state admin-orders__state--error" role="alert">
      {{ ordersStore.error }}
    </div>
    <div v-else-if="ordersStore.orders.length === 0" class="admin-orders__state">
      No hay órdenes para este tenant.
    </div>

    <div v-else class="admin-orders__table-wrap">
      <table class="admin-orders__table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Fecha</th>
            <th scope="col">Cliente</th>
            <th scope="col">Teléfono</th>
            <th scope="col">Estado</th>
            <th scope="col">Total</th>
            <th scope="col">Pagado</th>
            <th scope="col">Ítems</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in ordersStore.orders"
            :key="o.id_order"
            class="admin-orders__row"
            tabindex="0"
            @click="openModal(o)"
            @keydown.enter.prevent="openModal(o)"
            @keydown.space.prevent="openModal(o)"
          >
            <td class="admin-orders__id" data-label="ID">ID: {{ o.id_order }}</td>
            <td data-label="Fecha">{{ formatDate(o.created_on) }}</td>
            <td class="admin-orders__cell-text" data-label="Cliente">{{ o.user_name ?? '—' }}</td>
            <td class="admin-orders__cell-text" data-label="Teléfono">{{ o.phone ?? '—' }}</td>
            <td data-label="Estado"><span class="admin-orders__badge">{{ o.status }}</span></td>
            <td data-label="Total">{{ formatMoney(o.total_price) }}</td>
            <td data-label="Pagado">{{ o.paid ? 'Sí' : 'No' }}</td>
            <td data-label="Ítems">{{ o.order_items.length }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="selectedOrder"
      class="admin-order-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-order-modal-title"
    >
      <div class="admin-order-modal__backdrop" aria-hidden="true" @click="closeModal" />
      <div class="admin-order-modal__panel" @click.stop>
        <header class="admin-order-modal__head">
          <h2 id="admin-order-modal-title" class="admin-order-modal__title">
            Orden #{{ selectedOrder.id_order }}
          </h2>
          <button type="button" class="admin-order-modal__close" aria-label="Cerrar" @click="closeModal">
            ×
          </button>
        </header>

        <section v-if="selectedOrder.delivery_direction" class="admin-order-modal__maps">
          <h3 class="admin-order-modal__section-title">Dirección de entrega</h3>
          <p class="admin-order-modal__maps-caption">
            Vista previa con OpenStreetMap (sin scripts de Google) para evitar bloqueos de extensiones.
          </p>
          <div v-if="mapPreviewLoading" class="admin-order-modal__maps-loading">Cargando mapa…</div>
          <div v-else-if="mapPreviewSrc" class="admin-order-modal__maps-embed">
            <iframe
              class="admin-order-modal__maps-frame"
              :src="mapPreviewSrc"
              title="Vista previa del mapa (OpenStreetMap)"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            />
          </div>
          <p v-else-if="mapPreviewFailed" class="admin-order-modal__maps-hint" role="status">
            No pudimos obtener coordenadas para la vista previa (enlace corto, red o proxy bloqueado).
            Usá el enlace de abajo para abrir Google Maps en otra pestaña.
          </p>
          <a
            class="admin-order-modal__maps-link"
            :href="selectedOrder.delivery_direction"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >
            Abrir en Google Maps en una pestaña nueva
          </a>
          <p class="admin-order-modal__maps-url">{{ selectedOrder.delivery_direction }}</p>
        </section>

        <section class="admin-order-modal__section">
          <h3 class="admin-order-modal__section-title">Datos generales</h3>
          <dl class="admin-order-modal__dl">
            <div class="admin-order-modal__dl-row">
              <dt>ID orden</dt>
              <dd>{{ selectedOrder.id_order }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Tenant</dt>
              <dd>{{ selectedOrder.tenant_id }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Usuario (id)</dt>
              <dd>{{ selectedOrder.id_user ?? '—' }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Cliente</dt>
              <dd>{{ selectedOrder.user_name ?? '—' }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Teléfono</dt>
              <dd>{{ selectedOrder.phone ?? '—' }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Estado</dt>
              <dd>
                <span class="admin-orders__badge">{{ selectedOrder.status }}</span>
              </dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Total</dt>
              <dd>{{ formatMoney(selectedOrder.total_price) }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Pagado</dt>
              <dd>{{ selectedOrder.paid ? 'Sí' : 'No' }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Nota</dt>
              <dd class="admin-order-modal__multiline">{{ selectedOrder.note ?? '—' }}</dd>
            </div>
            <div v-if="!selectedOrder.delivery_direction" class="admin-order-modal__dl-row">
              <dt>Dirección / maps</dt>
              <dd>—</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Creada</dt>
              <dd>{{ formatDateOrDash(selectedOrder.created_on) }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Entrega prevista</dt>
              <dd>{{ formatDateOrDash(selectedOrder.delivery_date) }}</dd>
            </div>
          </dl>
        </section>

        <section class="admin-order-modal__section">
          <h3 class="admin-order-modal__section-title">Ítems</h3>
          <div class="admin-order-modal__table-wrap">
            <table class="admin-order-modal__items-table">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" class="admin-order-modal__items-table-num">Cantidad</th>
                  <th scope="col" class="admin-order-modal__items-table-num">Precio unitario</th>
                  <th scope="col" class="admin-order-modal__items-table-num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedOrder.order_items" :key="item.id_order_item">
                  <td class="admin-order-modal__item-name">{{ item.name }}</td>
                  <td class="admin-order-modal__items-table-num admin-order-modal__num">{{ item.quantity }}</td>
                  <td class="admin-order-modal__items-table-num admin-order-modal__num">
                    {{ formatMoney(item.unit_price) }}
                  </td>
                  <td class="admin-order-modal__items-table-num admin-order-modal__num">
                    {{ lineSubtotal(item.unit_price, item.quantity) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
