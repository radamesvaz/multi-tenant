<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { SubscriptionCanceledError } from '../../../core/auth/subscriptionApi';
import type { CreateProductPayload, CreateProductStatus } from '../../../core/models';
import { productThumbnailUploadHintEs } from '../../../core/constants/productThumbnailSpec';
import { AppSnackbar } from '../../../shared/components';
import { useAdminProductsStore } from '../store';
import './AdminProductFormPage.css';

const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const productsStore = useAdminProductsStore();
const router = useRouter();

const formName = ref('');
const formDescription = ref('');
const formPrice = ref('');
const formStock = ref('');
const formStatus = ref<CreateProductStatus>('active');
const formAvailable = ref(true);

const createdProductId = ref<number | null>(null);
const createdProductName = ref('');
const selectedImageFiles = ref<File[]>([]);
const imagePreviewUrls = ref<string[]>([]);

const isSubmitting = ref(false);
const isUploadingImages = ref(false);
const errorMessage = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});

const snackbarOpen = ref(false);
const snackbarMessage = ref('');

const thumbnailUploadHint = productThumbnailUploadHintEs();
const isCreated = computed(() => createdProductId.value != null);
const availabilityLockedByStatus = computed(() => formStatus.value !== 'active');

watch(formStatus, (status) => {
  if (status !== 'active') {
    formAvailable.value = false;
  }
});

function showSnackbar(message: string) {
  snackbarMessage.value = message;
  snackbarOpen.value = true;
}

function revokeImagePreviews() {
  for (const url of imagePreviewUrls.value) {
    URL.revokeObjectURL(url);
  }
  imagePreviewUrls.value = [];
}

function validateCreateForm(): CreateProductPayload | null {
  const errors: Record<string, string> = {};
  const name = formName.value.trim();
  const description = formDescription.value.trim();
  const priceStr = String(formPrice.value ?? '').trim();
  const stockStr = String(formStock.value ?? '').trim();
  const price = Number(priceStr);

  if (!name) {
    errors.name = 'El nombre es obligatorio.';
  }
  if (!description) {
    errors.description = 'La descripción es obligatoria.';
  }
  if (!priceStr || Number.isNaN(price) || price <= 0) {
    errors.price = 'El precio debe ser mayor que 0.';
  }
  if (stockStr !== '') {
    const stock = Number(stockStr);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = 'El inventario debe ser un entero mayor o igual a 0.';
    }
  }

  fieldErrors.value = errors;
  if (Object.keys(errors).length > 0) {
    return null;
  }

  return {
    name,
    description,
    price,
    available: formStatus.value === 'active' ? formAvailable.value : false,
    stock: stockStr === '' ? 0 : Number(stockStr),
    status: formStatus.value,
  };
}

function filterAcceptedImages(files: File[]): File[] {
  return files.filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type.toLowerCase()));
}

function onImagesSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  revokeImagePreviews();
  const accepted = filterAcceptedImages(Array.from(input.files ?? []));
  if (accepted.length === 0 && (input.files?.length ?? 0) > 0) {
    errorMessage.value = 'Solo se aceptan imágenes JPG, PNG o WebP.';
    selectedImageFiles.value = [];
    return;
  }
  errorMessage.value = null;
  selectedImageFiles.value = accepted;
  imagePreviewUrls.value = accepted.map((file) => URL.createObjectURL(file));
}

function handleMutationError(err: unknown) {
  if (err instanceof SubscriptionCanceledError) {
    return;
  }
  errorMessage.value = err instanceof Error ? err.message : 'No se pudo completar la acción.';
}

async function onCreateProduct() {
  errorMessage.value = null;
  fieldErrors.value = {};
  if (isSubmitting.value || isCreated.value) return;

  const payload = validateCreateForm();
  if (!payload) return;

  isSubmitting.value = true;
  try {
    const response = await productsStore.createProduct(payload);
    createdProductId.value = response.product_id;
    createdProductName.value = payload.name;
    showSnackbar(response.message || 'Producto creado correctamente.');
  } catch (err) {
    handleMutationError(err);
  } finally {
    isSubmitting.value = false;
  }
}

async function onUploadImages() {
  errorMessage.value = null;
  if (!createdProductId.value || selectedImageFiles.value.length === 0 || isUploadingImages.value) {
    return;
  }

  isUploadingImages.value = true;
  try {
    await productsStore.addProductImages(createdProductId.value, selectedImageFiles.value);
    showSnackbar('Imágenes subidas correctamente.');
    void router.push({ name: 'admin-products' });
  } catch (err) {
    handleMutationError(err);
  } finally {
    isUploadingImages.value = false;
  }
}

function skipImagesAndReturn() {
  void router.push({ name: 'admin-products' });
}

onUnmounted(() => {
  revokeImagePreviews();
});
</script>

<template>
  <div class="admin-product-form">
    <header class="admin-product-form__header">
      <div class="admin-product-form__header-row">
        <h1>Nuevo producto</h1>
        <RouterLink :to="{ name: 'admin-products' }" class="admin-product-form__back">
          Volver al listado
        </RouterLink>
      </div>
      <p class="admin-product-form__subtitle">
        Completá los datos y creá el producto. Las imágenes se suben en un paso aparte, después del
        alta.
      </p>
    </header>

    <form class="admin-product-form__form" @submit.prevent="onCreateProduct">
      <fieldset class="admin-product-form__fieldset" :disabled="isCreated">
        <legend class="admin-product-form__legend">Datos del producto</legend>

        <div class="admin-product-form__grid">
          <label class="admin-product-form__field">
            <span>Nombre <strong aria-hidden="true">*</strong></span>
            <input
              v-model="formName"
              type="text"
              name="name"
              autocomplete="off"
              :aria-invalid="fieldErrors.name ? 'true' : undefined"
            />
            <span v-if="fieldErrors.name" class="admin-product-form__field-error" role="alert">
              {{ fieldErrors.name }}
            </span>
          </label>

          <label class="admin-product-form__field">
            <span>Precio <strong aria-hidden="true">*</strong></span>
            <input
              v-model="formPrice"
              type="number"
              name="price"
              step="0.01"
              min="0"
              :aria-invalid="fieldErrors.price ? 'true' : undefined"
            />
            <span v-if="fieldErrors.price" class="admin-product-form__field-error" role="alert">
              {{ fieldErrors.price }}
            </span>
          </label>

          <label class="admin-product-form__field">
            <span>Inventario</span>
            <input
              v-model="formStock"
              type="number"
              name="stock"
              min="0"
              step="1"
              placeholder="0"
              :aria-invalid="fieldErrors.stock ? 'true' : undefined"
            />
            <span v-if="fieldErrors.stock" class="admin-product-form__field-error" role="alert">
              {{ fieldErrors.stock }}
            </span>
          </label>

          <label class="admin-product-form__field">
            <span>Estado</span>
            <select v-model="formStatus" name="status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="deleted">deleted</option>
            </select>
          </label>

          <div
            :class="[
              'admin-product-form__availability',
              availabilityLockedByStatus ? 'admin-product-form__availability--locked' : '',
            ]"
          >
            <span class="admin-product-form__availability-label">Disponible para compra</span>
            <label class="admin-product-form__switch">
              <input
                v-model="formAvailable"
                type="checkbox"
                :disabled="availabilityLockedByStatus"
              />
              <span class="admin-product-form__switch-track" aria-hidden="true" />
            </label>
            <span
              :class="[
                'admin-product-form__availability-value',
                formAvailable
                  ? 'admin-product-form__availability-value--on'
                  : 'admin-product-form__availability-value--off',
              ]"
            >
              {{ formAvailable ? 'Sí' : 'No' }}
            </span>
          </div>
        </div>

        <label class="admin-product-form__field admin-product-form__field--full">
          <span>Descripción <strong aria-hidden="true">*</strong></span>
          <textarea
            v-model="formDescription"
            name="description"
            rows="4"
            :aria-invalid="fieldErrors.description ? 'true' : undefined"
          />
          <span
            v-if="fieldErrors.description"
            class="admin-product-form__field-error"
            role="alert"
          >
            {{ fieldErrors.description }}
          </span>
        </label>
      </fieldset>

      <p v-if="errorMessage && !isCreated" class="admin-product-form__error" role="alert">
        {{ errorMessage }}
      </p>

      <div v-if="!isCreated" class="admin-product-form__actions">
        <button type="submit" class="admin-product-form__btn" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creando…' : 'Crear producto' }}
        </button>
      </div>
    </form>

    <section v-if="isCreated" class="admin-product-form__images" aria-labelledby="images-step-title">
      <h2 id="images-step-title" class="admin-product-form__images-title">
        Imágenes (opcional) — {{ createdProductName }}
      </h2>
      <p class="admin-product-form__images-hint">
        Producto creado con ID <strong>{{ createdProductId }}</strong>. Podés subir una o más
        imágenes ahora o hacerlo más tarde desde el listado.
      </p>
      <p class="admin-product-form__images-hint">{{ thumbnailUploadHint }}</p>

      <label class="admin-product-form__field admin-product-form__field--full">
        <span>Archivos de imagen</span>
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          :disabled="isUploadingImages"
          @change="onImagesSelected"
        />
      </label>

      <ul v-if="imagePreviewUrls.length > 0" class="admin-product-form__previews">
        <li v-for="(url, index) in imagePreviewUrls" :key="url" class="admin-product-form__preview">
          <img :src="url" alt="" loading="lazy" decoding="async" />
          <span class="admin-product-form__preview-name">{{ selectedImageFiles[index]?.name }}</span>
        </li>
      </ul>

      <p v-if="errorMessage" class="admin-product-form__error" role="alert">
        {{ errorMessage }}
      </p>

      <div class="admin-product-form__actions">
        <button
          type="button"
          class="admin-product-form__btn"
          :disabled="isUploadingImages || selectedImageFiles.length === 0"
          @click="onUploadImages"
        >
          {{ isUploadingImages ? 'Subiendo…' : 'Subir imágenes y volver al listado' }}
        </button>
        <button
          type="button"
          class="admin-product-form__btn admin-product-form__btn--secondary"
          :disabled="isUploadingImages"
          @click="skipImagesAndReturn"
        >
          Omitir y volver al listado
        </button>
      </div>
    </section>

    <AppSnackbar v-model:visible="snackbarOpen" :message="snackbarMessage" />
  </div>
</template>
