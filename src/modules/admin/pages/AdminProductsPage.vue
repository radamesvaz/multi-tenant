<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { 
  Product, 
  ProductStatus, 
  UpdateProductDetailsPayload, 
} from '../../../core/models';
import { envConfig } from '../../../core/config/env';
import { productThumbnailUploadHintEs } from '../../../core/constants/productThumbnailSpec';
import { useAdminProductsStore } from '../store';
import './AdminProductsPage.css';

const productsStore = useAdminProductsStore();

const selectedProductId = ref<number | null>(null);
const selectedProduct = computed(() =>
  productsStore.products.find((p) => p.id_product === selectedProductId.value) ?? null,
);

const formName = ref('');
const formDescription = ref('');
const formPrice = ref('');
const formStock = ref('');
const formStatus = ref<ProductStatus>('active');
const formAvailable = ref(true);
const availabilityLockedByStatus = computed(() => formStatus.value !== 'active');

const thumbnailFileInput = ref<HTMLInputElement | null>(null);
/** Vista previa local de la imagen elegida (aún no guardada en el servidor). */
const thumbnailLocalPreviewUrl = ref<string | null>(null);
/** Archivo seleccionado pendiente de subir con «Guardar miniatura». */
const pendingThumbnailFile = ref<File | null>(null);
const galleryFileInput = ref<HTMLInputElement | null>(null);

const isSavingDetails = ref(false);
const isUpdatingThumbnail = ref(false);
const isUpdatingGallery = ref(false);
const modalError = ref<string | null>(null);
const modalSuccess = ref<string | null>(null);

const selectedGalleryFiles = ref<File[]>([]);

const thumbnailUploadHint = productThumbnailUploadHintEs();

const SEARCH_DEBOUNCE_MS = 400;
const searchInput = ref('');
const debouncedSearch = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (v) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = v.trim();
  }, SEARCH_DEBOUNCE_MS);
});

watch(
  debouncedSearch,
  () => {
    void productsStore.loadFirstPage(debouncedSearch.value);
  },
  { immediate: true },
);

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const u = String(url).trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${envConfig.apiBaseUrl}${u.startsWith('/') ? u : `/${u}`}`;
}

const thumbnailPreviewSrc = computed(() => {
  if (thumbnailLocalPreviewUrl.value) return thumbnailLocalPreviewUrl.value;
  return resolveMediaUrl(selectedProduct.value?.thumbnail_url ?? null);
});

const hasPendingThumbnailChange = computed(() => pendingThumbnailFile.value !== null);

function revokeThumbnailLocalPreview() {
  if (thumbnailLocalPreviewUrl.value) {
    URL.revokeObjectURL(thumbnailLocalPreviewUrl.value);
    thumbnailLocalPreviewUrl.value = null;
  }
  pendingThumbnailFile.value = null;
}

function triggerThumbnailFilePicker() {
  thumbnailFileInput.value?.click();
}

let removeKeyListener: (() => void) | undefined;
onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  window.addEventListener('keydown', onKey);
  removeKeyListener = () => window.removeEventListener('keydown', onKey);
});

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  removeKeyListener?.();
  revokeThumbnailLocalPreview();
});

watch(selectedProductId, (id) => {
  if (id == null) {
    revokeThumbnailLocalPreview();
    return;
  }
  const p = productsStore.products.find((x) => x.id_product === id);
  if (!p) return;
  hydrateFormFromProduct(p);
});

watch(formStatus, (status) => {
  if (status !== 'active') {
    formAvailable.value = false;
  }
});

function hydrateFormFromProduct(p: Product) {
  revokeThumbnailLocalPreview();
  formName.value = p.name;
  formDescription.value = p.description ?? '';
  formPrice.value = String(p.price);
  formStock.value = p.stock == null ? '' : String(p.stock);
  formStatus.value = p.status;
  formAvailable.value = p.available;
  selectedGalleryFiles.value = [];
  if (galleryFileInput.value) galleryFileInput.value.value = '';
  if (thumbnailFileInput.value) thumbnailFileInput.value.value = '';
}

function openModal(p: Product) {
  selectedProductId.value = p.id_product;
  modalError.value = null;
  modalSuccess.value = null;
  hydrateFormFromProduct(p);
}

function closeModal() {
  selectedProductId.value = null;
}

function formatPrice(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function setModalResultError(error: unknown) {
  modalSuccess.value = null;
  modalError.value = (error as Error).message || 'No se pudo completar la operación.';
}

function setModalResultSuccess(message: string) {
  modalError.value = null;
  modalSuccess.value = message;
}

async function saveGeneralDetails() {
  if (!selectedProduct.value) return;
  isSavingDetails.value = true;
  try {
    // `v-model` on number inputs can bind numeric values; normalize with String() before trim.
    const priceStr = String(formPrice.value ?? '').trim();
    const stockStr = String(formStock.value ?? '').trim();
    const payload: UpdateProductDetailsPayload = {
      name: formName.value.trim(),
      description: formDescription.value.trim() ? formDescription.value.trim() : null,
      price: Number(priceStr),
      stock: stockStr === '' ? null : Number(stockStr),
      status: formStatus.value,
      available: formStatus.value === 'active' ? formAvailable.value : false,
    };
    const refreshed = await productsStore.updateProductDetails(selectedProduct.value.id_product, payload);
    hydrateFormFromProduct(refreshed);
    setModalResultSuccess('Datos del producto actualizados.');
  } catch (error) {
    setModalResultError(error);
  } finally {
    isSavingDetails.value = false;
  }
}

function handleThumbnailFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!selectedProduct.value) return;
  if (!file) {
    revokeThumbnailLocalPreview();
    return;
  }
  revokeThumbnailLocalPreview();
  pendingThumbnailFile.value = file;
  thumbnailLocalPreviewUrl.value = URL.createObjectURL(file);
}

async function savePendingThumbnail() {
  if (!selectedProduct.value || !pendingThumbnailFile.value) return;
  isUpdatingThumbnail.value = true;
  try {
    const refreshed = await productsStore.uploadProductThumbnail(
      selectedProduct.value.id_product,
      pendingThumbnailFile.value,
    );
    hydrateFormFromProduct(refreshed);
    setModalResultSuccess('Miniatura guardada correctamente.');
  } catch (error) {
    setModalResultError(error);
  } finally {
    isUpdatingThumbnail.value = false;
    if (thumbnailFileInput.value) thumbnailFileInput.value.value = '';
  }
}

function onGalleryFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  selectedGalleryFiles.value = Array.from(input.files ?? []);
}

async function addGalleryImages() {
  if (!selectedProduct.value || selectedGalleryFiles.value.length === 0) return;
  isUpdatingGallery.value = true;
  try {
    const refreshed = await productsStore.addProductImages(
      selectedProduct.value.id_product,
      selectedGalleryFiles.value,
    );
    hydrateFormFromProduct(refreshed);
    setModalResultSuccess('Imágenes agregadas.');
  } catch (error) {
    setModalResultError(error);
  } finally {
    isUpdatingGallery.value = false;
  }
}

async function removeGalleryImage(url: string) {
  if (!selectedProduct.value) return;
  isUpdatingGallery.value = true;
  try {
    const refreshed = await productsStore.deleteProductImage(selectedProduct.value.id_product, url);
    hydrateFormFromProduct(refreshed);
    setModalResultSuccess('Imagen eliminada de la galería.');
  } catch (error) {
    setModalResultError(error);
  } finally {
    isUpdatingGallery.value = false;
  }
}
</script>

<template>
  <div class="admin-products">
    <header class="admin-products__header">
      <h1>Productos</h1>
      <p class="admin-products__subtitle">
        Catálogo paginado (<code>GET /t/&lt;slug&gt;/products</code> con JWT, <code>limit</code> /
        <code>cursor</code> / <code>q</code>). Hacé clic en una fila para editar.
      </p>
    </header>

    <div class="admin-products__search-sticky">
      <div class="admin-products__search">
        <label class="admin-products__search-label" for="admin-product-search">Buscador</label>
        <input
          id="admin-product-search"
          v-model="searchInput"
          type="search"
          class="admin-products__search-input"
          placeholder="Al menos 2 letras (prefijo del nombre)"
          autocomplete="off"
        />
      </div>
    </div>

    <div v-if="productsStore.isLoading && productsStore.products.length === 0" class="admin-products__state">
      Cargando…
    </div>
    <div
      v-else-if="productsStore.error && productsStore.products.length === 0"
      class="admin-products__state admin-products__state--error"
      role="alert"
    >
      {{ productsStore.error }}
    </div>
    <template v-else>
      <p
        v-if="productsStore.error"
        class="admin-products__state admin-products__state--error admin-products__state--soft"
        role="alert"
      >
        {{ productsStore.error }}
      </p>
      <div v-if="productsStore.products.length === 0" class="admin-products__state">
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
          <tr
            v-for="p in productsStore.products"
            :key="p.id_product"
            class="admin-products__row"
            tabindex="0"
            @click="openModal(p)"
            @keydown.enter.prevent="openModal(p)"
            @keydown.space.prevent="openModal(p)"
          >
            <td class="admin-products__name" data-label="Nombre">{{ p.name }}</td>
            <td data-label="Precio">{{ formatPrice(p.price) }}</td>
            <td data-label="Inventario">{{ p.stock ?? '—' }}</td>
            <td data-label="Estado"><span class="admin-products__badge">{{ p.status }}</span></td>
            <td data-label="Disponible">{{ p.available ? 'Sí' : 'No' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

      <div v-if="productsStore.hasMore" class="admin-products__more">
        <button
          type="button"
          class="admin-products__load-more"
          :disabled="productsStore.isLoadingMore"
          @click="productsStore.loadMore()"
        >
          {{ productsStore.isLoadingMore ? 'Cargando…' : 'Cargar más' }}
        </button>
      </div>
    </template>

    <div
      v-if="selectedProduct"
      class="admin-product-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-product-modal-title"
    >
      <div class="admin-product-modal__backdrop" aria-hidden="true" @click="closeModal" />
      <div class="admin-product-modal__panel" @click.stop>
        <header class="admin-product-modal__head">
          <h2 id="admin-product-modal-title" class="admin-product-modal__title">
            Editar: {{ selectedProduct.name }}
          </h2>
          <button type="button" class="admin-product-modal__close" aria-label="Cerrar" @click="closeModal">×</button>
        </header>

        <p v-if="modalError" class="admin-product-modal__msg admin-product-modal__msg--error" role="alert">
          {{ modalError }}
        </p>
        <p v-if="modalSuccess" class="admin-product-modal__msg admin-product-modal__msg--ok" role="status">
          {{ modalSuccess }}
        </p>

        <section class="admin-product-modal__section">
          <h3 class="admin-product-modal__section-title">Datos generales</h3>
          <div class="admin-product-modal__grid">
            <label>
              Nombre
              <input v-model="formName" type="text" class="admin-product-modal__input" />
            </label>
            <label>
              Precio
              <input v-model="formPrice" type="number" step="0.01" min="0" class="admin-product-modal__input" />
            </label>
            <label>
              Stock
              <input v-model="formStock" type="number" min="0" class="admin-product-modal__input" />
            </label>
            <label>
              Estado
              <select v-model="formStatus" class="admin-product-modal__input">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="archived">archived</option>
                <option value="deleted">deleted</option>
              </select>
            </label>
            <div
              :class="[
                'admin-product-modal__availability',
                availabilityLockedByStatus ? 'admin-product-modal__availability--locked' : '',
              ]"
            >
              <span class="admin-product-modal__availability-label">Disponible para compra</span>
              <label class="admin-product-modal__switch">
                <input v-model="formAvailable" type="checkbox" :disabled="availabilityLockedByStatus" />
                <span class="admin-product-modal__switch-track" aria-hidden="true" />
              </label>
              <span
                :class="[
                  'admin-product-modal__availability-value',
                  formAvailable ? 'admin-product-modal__availability-value--on' : 'admin-product-modal__availability-value--off',
                ]"
              >
                {{ formAvailable ? 'Sí' : 'No' }}
              </span>
            </div>
            <p v-if="availabilityLockedByStatus" class="admin-product-modal__availability-help">
              Disponibilidad solo aplica cuando el estado es <code>active</code>.
            </p>
          </div>
          <label>
            Descripción
            <textarea v-model="formDescription" class="admin-product-modal__input" rows="3" />
          </label>
          <div class="admin-product-modal__actions">
            <button type="button" class="admin-product-modal__btn" :disabled="isSavingDetails" @click="saveGeneralDetails">
              {{ isSavingDetails ? 'Guardando…' : 'Guardar datos' }}
            </button>
          </div>
        </section>

        <section class="admin-product-modal__section">
          <h3 class="admin-product-modal__section-title">Miniatura</h3>
          <p class="admin-product-modal__hint">{{ thumbnailUploadHint }}</p>
          <div class="admin-product-modal__thumbnail-block">
            <input
              ref="thumbnailFileInput"
              type="file"
              accept="image/*"
              class="admin-product-modal__file admin-product-modal__file--hidden"
              tabindex="-1"
              :disabled="isUpdatingThumbnail"
              @change="handleThumbnailFileChange"
            />
            <button
              type="button"
              class="admin-product-modal__thumbnail-trigger"
              :disabled="isUpdatingThumbnail"
              aria-label="Seleccionar imagen de miniatura"
              @click="triggerThumbnailFilePicker"
            >
              <div class="admin-product-modal__thumbnail-preview">
                <img
                  v-if="thumbnailPreviewSrc"
                  :src="thumbnailPreviewSrc"
                  alt=""
                  class="admin-product-modal__thumbnail-img"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="admin-product-modal__thumbnail-placeholder">Sin miniatura</div>
              </div>
            </button>
            <div class="admin-product-modal__thumbnail-upload">
              <button
                type="button"
                class="admin-product-modal__btn admin-product-modal__btn--secondary"
                :disabled="!hasPendingThumbnailChange || isUpdatingThumbnail"
                @click="savePendingThumbnail"
              >
                {{ isUpdatingThumbnail ? 'Guardando…' : 'Guardar miniatura' }}
              </button>
            </div>
          </div>
        </section>

        <section class="admin-product-modal__section">
          <h3 class="admin-product-modal__section-title">Galería</h3>
          <div class="admin-product-modal__inline">
            <input
              ref="galleryFileInput"
              type="file"
              multiple
              accept="image/*"
              class="admin-product-modal__file"
              :disabled="isUpdatingGallery"
              @change="onGalleryFilesSelected"
            />
          </div>
          <div class="admin-product-modal__actions">
            <button
              type="button"
              class="admin-product-modal__btn admin-product-modal__btn--secondary"
              :disabled="isUpdatingGallery || selectedGalleryFiles.length === 0"
              @click="addGalleryImages"
            >
              Agregar imágenes
            </button>
          </div>

          <ul class="admin-product-modal__gallery-list">
            <li v-for="url in selectedProduct.image_urls" :key="url" class="admin-product-modal__gallery-item">
              <div class="admin-product-modal__gallery-thumb">
                <img
                  :src="resolveMediaUrl(url) ?? url"
                  :title="url"
                  alt=""
                  class="admin-product-modal__gallery-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div class="admin-product-modal__gallery-item-actions">
                <button
                  type="button"
                  class="admin-product-modal__btn admin-product-modal__btn--danger"
                  :disabled="isUpdatingGallery"
                  @click="removeGalleryImage(url)"
                >
                  Eliminar
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
