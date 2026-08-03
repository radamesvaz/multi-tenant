<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { 
  Product, 
  ProductStatus, 
  UpdateProductDetailsPayload, 
} from '../../../core/models';
import { envConfig } from '../../../core/config/env';
import { productThumbnailUploadHintEs } from '../../../core/constants/productThumbnailSpec';
import { productImageUploadHintEs } from '../../../core/constants/productImageSpec';
import { RouterLink } from 'vue-router';
import { useAdminHeaderSearch } from '../composables';
import { useAdminProductsStore } from '../store';
import './AdminProductsPage.css';

const productsStore = useAdminProductsStore();
const { debouncedSearch } = useAdminHeaderSearch();

const selectedProductId = ref<number | null>(null);
const selectedProduct = computed(() =>
  productsStore.products.find((p) => p.id_product === selectedProductId.value) ?? null,
);

const formName = ref('');
const formDescription = ref('');
const formPrice = ref('');
const formStock = ref('');
const formStatus = ref<ProductStatus>('active');
const formTrackInventory = ref(true);
const stockInputDisabled = computed(() => !formTrackInventory.value);

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
const galleryUploadHint = productImageUploadHintEs();

watch(
  debouncedSearch,
  (q) => {
    void productsStore.loadFirstPage(q);
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

function productListThumbSrc(p: Product): string | null {
  return resolveMediaUrl(p.thumbnail_url);
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

function onIncludeDeletedChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  void productsStore.setIncludeDeleted(checked);
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

function hydrateFormFromProduct(p: Product) {
  revokeThumbnailLocalPreview();
  formName.value = p.name;
  formDescription.value = p.description ?? '';
  formPrice.value = String(p.price);
  formStock.value = String(p.stock);
  formStatus.value = p.status;
  formTrackInventory.value = p.track_inventory;
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
    const description = formDescription.value.trim();
    if (!description) {
      setModalResultError(new Error('La descripción es obligatoria.'));
      return;
    }
    const payload: UpdateProductDetailsPayload = {
      name: formName.value.trim(),
      description,
      price: Number(priceStr),
      stock: stockStr === '' ? 0 : Number(stockStr),
      status: formStatus.value,
      track_inventory: formTrackInventory.value,
    };
    const refreshed = await productsStore.updateProductDetails(selectedProduct.value.id_product, payload);
    if (refreshed.status === 'deleted' && !productsStore.includeDeleted) {
      closeModal();
      return;
    }
    hydrateFormFromProduct(refreshed);
    setModalResultSuccess('Datos del producto actualizados.');
  } catch (error) {
    setModalResultError(error);
  } finally {
    isSavingDetails.value = false;
  }
}

async function patchStatus(status: ProductStatus) {
  if (!selectedProduct.value) return;
  isSavingDetails.value = true;
  try {
    const id = selectedProduct.value.id_product;
    const refreshed = await productsStore.setProductStatus(id, status);
    const labels: Record<ProductStatus, string> = {
      active: 'Producto publicado.',
      inactive: 'Producto pausado (oculto en la tienda).',
      deleted: 'Producto marcado como eliminado.',
    };
    if (status === 'deleted' && !productsStore.includeDeleted) {
      closeModal();
      return;
    }
    hydrateFormFromProduct(refreshed);
    setModalResultSuccess(labels[status]);
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
      <div class="admin-products__header-row">
        <p class="admin-products__subtitle">
          Catálogo paginado con búsqueda. Hacé clic en una fila para editar o creá un producto nuevo.
        </p>
        <RouterLink :to="{ name: 'admin-product-new' }" class="admin-products__new-btn">
          Nuevo producto
        </RouterLink>
      </div>
      <label class="admin-products__deleted-toggle">
        <input
          type="checkbox"
          :checked="productsStore.includeDeleted"
          @change="onIncludeDeletedChange"
        />
        <span>Mostrar eliminados</span>
      </label>
    </header>

    <p
      v-if="productsStore.isLoading && productsStore.products.length > 0"
      class="admin-products__refresh"
      aria-live="polite"
    >
      Actualizando…
    </p>

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
        <p v-if="debouncedSearch">No hay productos que coincidan con la búsqueda.</p>
        <p v-else-if="productsStore.includeDeleted">No hay productos para este tenant.</p>
        <p v-else>No hay productos activos o pausados. Activá «Mostrar eliminados» para ver soft deletes.</p>
        <RouterLink
          v-if="!debouncedSearch"
          :to="{ name: 'admin-product-new' }"
          class="admin-products__new-btn"
        >
          Crear primer producto
        </RouterLink>
      </div>

      <div v-else class="admin-products__list">
        <article
          v-for="p in productsStore.products"
          :key="p.id_product"
          class="admin-products__card"
          tabindex="0"
          role="button"
          :aria-label="`Editar ${p.name}`"
          @click="openModal(p)"
          @keydown.enter.prevent="openModal(p)"
          @keydown.space.prevent="openModal(p)"
        >
          <div class="admin-products__card-body">
            <h2 class="admin-products__card-name">{{ p.name }}</h2>
            <p v-if="p.description" class="admin-products__card-desc">{{ p.description }}</p>
            <p class="admin-products__card-price">{{ formatPrice(p.price) }}</p>
            <div class="admin-products__card-meta">
              <span
                class="admin-products__badge"
                :class="{ 'admin-products__badge--deleted': p.status === 'deleted' }"
              >{{ p.status }}</span>
              <span class="admin-products__card-meta-item">
                Inventario: {{ p.track_inventory ? p.stock : '∞' }}
              </span>
              <span class="admin-products__card-meta-item">
                Limita stock: {{ p.track_inventory ? 'Sí' : 'No' }}
              </span>
            </div>
          </div>
          <div class="admin-products__card-media" aria-hidden="true">
            <img
              v-if="productListThumbSrc(p)"
              :src="productListThumbSrc(p)!"
              alt=""
              class="admin-products__card-img"
              loading="lazy"
              decoding="async"
            />
            <span v-else class="admin-products__card-img-placeholder">Sin foto</span>
          </div>
        </article>
      </div>

      <div v-if="productsStore.hasMore" class="admin-products__more">
        <button
          type="button"
          class="admin-products__load-more"
          :disabled="productsStore.isLoadingMore || productsStore.isLoading"
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
              <input
                v-model="formStock"
                type="number"
                min="0"
                class="admin-product-modal__input"
                :disabled="stockInputDisabled"
              />
            </label>
            <label>
              Estado
              <select v-model="formStatus" class="admin-product-modal__input">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="deleted">deleted</option>
              </select>
            </label>
            <div class="admin-product-modal__availability">
              <span class="admin-product-modal__availability-label">Limitar stock online</span>
              <label class="admin-product-modal__switch">
                <input v-model="formTrackInventory" type="checkbox" />
                <span class="admin-product-modal__switch-track" aria-hidden="true" />
              </label>
              <span
                :class="[
                  'admin-product-modal__availability-value',
                  formTrackInventory
                    ? 'admin-product-modal__availability-value--on'
                    : 'admin-product-modal__availability-value--off',
                ]"
              >
                {{ formTrackInventory ? 'Sí' : 'No' }}
              </span>
            </div>
            <p v-if="!formTrackInventory" class="admin-product-modal__availability-help">
              Con el límite desactivado, el stock no bloquea las ventas en la tienda.
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
          <div class="admin-product-modal__actions admin-product-modal__actions--status">
            <button
              type="button"
              class="admin-product-modal__btn admin-product-modal__btn--secondary"
              :disabled="isSavingDetails || selectedProduct.status === 'active'"
              @click="patchStatus('active')"
            >
              Publicar
            </button>
            <button
              type="button"
              class="admin-product-modal__btn admin-product-modal__btn--secondary"
              :disabled="isSavingDetails || selectedProduct.status === 'inactive'"
              @click="patchStatus('inactive')"
            >
              Pausar
            </button>
            <button
              type="button"
              class="admin-product-modal__btn admin-product-modal__btn--secondary"
              :disabled="isSavingDetails || selectedProduct.status === 'deleted'"
              @click="patchStatus('deleted')"
            >
              Eliminar
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
          <p class="admin-product-modal__hint">{{ galleryUploadHint }}</p>
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
