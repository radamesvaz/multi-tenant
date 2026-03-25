<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  isPatchableOrderStatus,
  ORDER_STATUS_LABELS,
  PATCHABLE_ORDER_STATUSES,
} from '../../../core/enums';
import type { 
  Order, 
  OrderPatchableStatus, 
  OrderStatus, 
  UpdateAuthOrderPayload, 
} from '../../../core/models';
import { osmEmbedUrl, resolveLatLngForMapsUrl } from '../../../core/utils';
import { orderService } from '../../../core/services';
import { useAuthStore } from '../../../shared/store';
import { useOrdersStore } from '../store';
import './AdminOrdersPage.css';

const ordersStore = useOrdersStore();
const selectedOrder = ref<Order | null>(null);

/** OpenStreetMap preview (no Google scripts) after resolving coordinates from URL. */
const mapPreviewSrc = ref<string | null>(null);
const mapPreviewLoading = ref(false);
const mapPreviewFailed = ref(false);
let mapPreviewAbort: AbortController | null = null;

/** Current value (read-only if `pending` / `expired`) + patchable transitions. */
const orderStatusSelectOptions = computed(
  (): Array<{ value: OrderStatus; label: string; disabled?: boolean }> => {
    const order = selectedOrder.value;
    if (!order) return [];

    const patchable = PATCHABLE_ORDER_STATUSES.map((value) => ({
      value,
      label: ORDER_STATUS_LABELS[value],
    }));

    if (!isPatchableOrderStatus(order.status)) {
      return [
        {
          value: order.status,
          label: ORDER_STATUS_LABELS[order.status],
          disabled: true,
        },
        ...patchable,
      ];
    }

    return patchable;
  },
);

const isUpdatingOrder = ref(false);
const updateOrderError = ref<string | null>(null);
let lastDeliveryDirection: string | null = null;

type MapsLinkCopyState = 'idle' | 'ok' | 'err';
const mapsLinkCopyState = ref<MapsLinkCopyState>('idle');
let mapsCopyResetTimer: ReturnType<typeof setTimeout> | null = null;

function resetMapsCopyFeedback() {
  if (mapsCopyResetTimer) {
    clearTimeout(mapsCopyResetTimer);
    mapsCopyResetTimer = null;
  }
  mapsLinkCopyState.value = 'idle';
}

async function copyDeliveryMapsLink() {
  const url = selectedOrder.value?.delivery_direction?.trim();
  if (!url) return;
  resetMapsCopyFeedback();
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API not available');
    }
    await navigator.clipboard.writeText(url);
    mapsLinkCopyState.value = 'ok';
    mapsCopyResetTimer = setTimeout(() => {
      mapsLinkCopyState.value = 'idle';
      mapsCopyResetTimer = null;
    }, 2200);
  } catch {
    mapsLinkCopyState.value = 'err';
    mapsCopyResetTimer = setTimeout(() => {
      mapsLinkCopyState.value = 'idle';
      mapsCopyResetTimer = null;
    }, 3500);
  }
}

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
  resetMapsCopyFeedback();

  document.body.style.overflow = order ? 'hidden' : '';

  const url = order?.delivery_direction?.trim() ?? null;
  const normalizedUrl = url || null;

  if (!order) {
    lastDeliveryDirection = null;
    mapPreviewAbort?.abort();
    mapPreviewAbort = null;
    mapPreviewSrc.value = null;
    mapPreviewFailed.value = false;
    mapPreviewLoading.value = false;
    return;
  }

  // Skip reloading the map when only non-address fields changed.
  if (normalizedUrl === lastDeliveryDirection) {
    return;
  }

  lastDeliveryDirection = normalizedUrl;

  mapPreviewAbort?.abort();
  mapPreviewAbort = null;
  mapPreviewSrc.value = null;
  mapPreviewFailed.value = false;
  mapPreviewLoading.value = false;

  if (!normalizedUrl) return;

  mapPreviewLoading.value = true;
  const ac = new AbortController();
  mapPreviewAbort = ac;
  try {
    const coords = await resolveLatLngForMapsUrl(normalizedUrl, ac.signal);
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

async function persistOrderPatch(patch: UpdateAuthOrderPayload) {
  if (!selectedOrder.value) return;
  if (isUpdatingOrder.value) return;

  isUpdatingOrder.value = true;
  updateOrderError.value = null;

  try {
    type UpdateOrderFn = (id_order: number, patch: UpdateAuthOrderPayload) => Promise<Order>;

    const updateOrderFn = (ordersStore as unknown as { updateOrder?: UpdateOrderFn }).updateOrder;

    // With HMR, the store instance may not expose a newly added action yet.
    // If `updateOrder` is missing, persist via the order service directly.
    const updated =
      updateOrderFn
        ? await updateOrderFn(selectedOrder.value.id_order, patch)
        : await (async () => {
            const id = selectedOrder.value?.id_order;
            if (!id) {
              throw new Error('Invalid order.');
            }
            const authStore = useAuthStore();
            const tenantSlug = authStore.getActiveAdminTenantSlug();
            const token = authStore.getToken(tenantSlug);

            if (!token) {
              throw new Error('Invalid session. Please sign in again.');
            }

            const u = await orderService.updateAuthOrder(token, id, patch);
            ordersStore.orders = ordersStore.orders.map((o) =>
              o.id_order === id ? u : o,
            );
            return u;
          })();
    selectedOrder.value = updated;
  } catch (error) {
    updateOrderError.value = (error as Error).message;
  } finally {
    isUpdatingOrder.value = false;
  }
}

function onOrderStatusChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value as OrderPatchableStatus;
  if (!PATCHABLE_ORDER_STATUSES.includes(value)) {
    return;
  }
  persistOrderPatch({ status: value });
}

function onPaidChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value === 'true';
  persistOrderPatch({ paid: value });
}

onUnmounted(() => {
  resetMapsCopyFeedback();
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
        Tenant orders from the JWT (<code>GET /auth/orders</code>, <code>Authorization: Bearer</code>). Click a row to
        open full details.
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
            :class="[
              'admin-orders__row',
              o.paid ? 'admin-orders__row--paid' : 'admin-orders__row--unpaid',
            ]"
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
            <td
              data-label="Pagado"
              :class="[
                'admin-orders__paid-cell',
                o.paid ? 'admin-orders__paid-cell--yes' : 'admin-orders__paid-cell--no',
              ]"
            >
              <span class="admin-orders__paid-value">
                <span class="admin-orders__paid-indicator" aria-hidden="true" />
                <span>{{ o.paid ? 'Sí' : 'No' }}</span>
              </span>
            </td>
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

        <div v-if="updateOrderError" class="admin-order-modal__inline-error" role="alert">
          {{ updateOrderError }}
        </div>

        <section class="admin-order-modal__section">
          <h3 class="admin-order-modal__section-title">Datos generales</h3>
          <dl class="admin-order-modal__dl">
            <div class="admin-order-modal__dl-row">
              <dt>Cliente</dt>
              <dd>{{ selectedOrder.user_name ?? '—' }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Teléfono</dt>
              <dd>{{ selectedOrder.phone ?? '—' }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Estado de la orden</dt>
              <dd>
                <select
                  class="admin-order-modal__select"
                  :disabled="isUpdatingOrder"
                  :value="selectedOrder.status"
                  @change="onOrderStatusChange"
                >
                  <option
                    v-for="opt in orderStatusSelectOptions"
                    :key="`${opt.value}-${opt.disabled ? 'ro' : 'rw'}`"
                    :value="opt.value"
                    :disabled="opt.disabled"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Total</dt>
              <dd>{{ formatMoney(selectedOrder.total_price) }}</dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Estado de pago</dt>
              <dd>
                <select
                  class="admin-order-modal__select"
                  :disabled="isUpdatingOrder"
                  :value="selectedOrder.paid ? 'true' : 'false'"
                  @change="onPaidChange"
                >
                  <option value="true">Pagado</option>
                  <option value="false">No pagado</option>
                </select>
              </dd>
            </div>
            <div class="admin-order-modal__dl-row">
              <dt>Nota</dt>
              <dd class="admin-order-modal__multiline">{{ selectedOrder.note ?? '—' }}</dd>
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

        <section v-if="selectedOrder.delivery_direction" class="admin-order-modal__maps">
          <h3 class="admin-order-modal__section-title">Dirección de entrega</h3>
          <p class="admin-order-modal__maps-caption">
            OpenStreetMap preview (no Google scripts) to reduce extension blocking.
          </p>
          <div v-if="mapPreviewLoading" class="admin-order-modal__maps-loading">Cargando mapa…</div>
          <div v-else-if="mapPreviewSrc" class="admin-order-modal__maps-embed">
            <iframe
              class="admin-order-modal__maps-frame"
              :src="mapPreviewSrc"
              title="Map preview (OpenStreetMap)"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            />
          </div>
          <p v-else-if="mapPreviewFailed" class="admin-order-modal__maps-hint" role="status">
            Could not resolve coordinates for the preview (short link, network, or blocked proxy). Use the link below
            to open Google Maps in a new tab.
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
          <div class="admin-order-modal__maps-url-row">
            <p class="admin-order-modal__maps-url">{{ selectedOrder.delivery_direction }}</p>
            <button
              type="button"
              class="admin-order-modal__maps-copy-btn"
              @click.stop="copyDeliveryMapsLink"
            >
              {{ mapsLinkCopyState === 'ok' ? 'Copiado' : 'Copiar enlace' }}
            </button>
          </div>
          <p
            v-if="mapsLinkCopyState === 'err'"
            class="admin-order-modal__maps-copy-err"
            role="status"
          >
            Could not copy. Select the link text above and copy it manually.
          </p>
        </section>

        <section v-else class="admin-order-modal__maps">
          <h3 class="admin-order-modal__section-title">Dirección de entrega</h3>
          <p class="admin-order-modal__maps-hint" role="status">—</p>
        </section>
      </div>
    </div>
  </div>
</template>
