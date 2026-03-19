<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { envConfig } from '../../../core/config';
import { orderService, productService } from '../../../core/services';
import type { CreateOrderPayload } from '../../../core/models';
import { useCurrentTenant } from '../../../shared/composables/useCurrentTenant';
import { useNotification } from '../../../shared/composables/useNotification';
import { useCartStore } from '../store/cart';
import './PublicCheckoutPage.css';

type ValidationIssueType = 'NOT_FOUND' | 'UNAVAILABLE' | 'INSUFFICIENT_STOCK' | 'PRICE_CHANGED';

type ValidationIssue = {
  productId: number;
  productName: string;
  type: ValidationIssueType;
  message: string;
};

const PHONE_PREFIXES = ['0412', '0414', '0416', '0422', '0424', '0426'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const { tenantSlug } = useCurrentTenant();
const cartStore = useCartStore();
const { notifyError, notifySuccess } = useNotification();

const form = ref({
  name: '',
  email: '',
  phonePrefix: '',
  phone: '',
  deliveryDate: '',
  note: '',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const isValidatingCatalog = ref(false);
const validationIssues = ref<ValidationIssue[]>([]);
const showWhatsAppWebHelper = ref(false);
const whatsappMessage = ref('');
const statusInfo = ref('');

const homeRoute = computed(() => `/t/${tenantSlug.value}`);
const cartRoute = computed(() => `/t/${tenantSlug.value}/cart`);

const minDeliveryDate = computed(() => {
  const now = new Date();
  now.setDate(now.getDate() + 2);
  return now.toISOString().slice(0, 10);
});

const hasBlockingConflicts = computed(() =>
  validationIssues.value.some((issue) =>
    ['NOT_FOUND', 'UNAVAILABLE', 'INSUFFICIENT_STOCK'].includes(issue.type)
  )
);

const formattedTotal = computed(() =>
  cartStore.totalPrice.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
);

const submitButtonText = computed(() => {
  if (isSubmitting.value) return 'Procesando...';
  if (isValidatingCatalog.value) return 'Validando carrito...';
  return 'Realizar Pedido';
});

const canSubmit = computed(() => {
  return (
    cartStore.items.length > 0 &&
    !isSubmitting.value &&
    !isValidatingCatalog.value &&
    !hasBlockingConflicts.value
  );
});

const getItemSubtotal = (price: number, quantity: number) =>
  (price * quantity).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getIssueTypeLabel = (type: ValidationIssueType) => {
  switch (type) {
    case 'NOT_FOUND':
      return 'No encontrado';
    case 'UNAVAILABLE':
      return 'Sin disponibilidad';
    case 'INSUFFICIENT_STOCK':
      return 'Stock insuficiente';
    case 'PRICE_CHANGED':
      return 'Precio actualizado';
    default:
      return 'Actualización';
  }
};

const validateForm = () => {
  const nextErrors: Record<string, string> = {};
  const trimmedName = form.value.name.trim();
  const trimmedEmail = form.value.email.trim();
  const trimmedPhone = form.value.phone.trim();
  const numericPhone = trimmedPhone.replace(/\D/g, '');

  if (trimmedName.length < 2) {
    nextErrors.name = 'Por favor ingresa tu nombre completo';
  }
  if (!emailRegex.test(trimmedEmail)) {
    nextErrors.email = 'Por favor ingresa un correo electrónico válido';
  }
  if (!form.value.phonePrefix) {
    nextErrors.phonePrefix = 'Por favor selecciona el prefijo telefónico';
  }
  if (numericPhone.length < 7) {
    nextErrors.phone = 'Por favor ingresa el número de teléfono';
  }
  if (!form.value.deliveryDate) {
    nextErrors.deliveryDate = 'Por favor elige una fecha de entrega';
  } else if (form.value.deliveryDate < minDeliveryDate.value) {
    nextErrors.deliveryDate = 'La fecha debe ser al menos 2 días a partir de hoy';
  }

  errors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
};

const validateCartWithCatalog = async () => {
  if (cartStore.items.length === 0) {
    validationIssues.value = [];
    return;
  }

  isValidatingCatalog.value = true;
  statusInfo.value = 'Estamos verificando disponibilidad y precios...';

  try {
    const catalog = await productService.getPublicProducts();
    const map = new Map(catalog.map((product) => [product.id_product, product]));
    const issues: ValidationIssue[] = [];

    const nextItems = cartStore.items.map((item) => {
      const fromCatalog = map.get(item.product.id_product);
      if (!fromCatalog) {
        issues.push({
          productId: item.product.id_product,
          productName: item.product.name,
          type: 'NOT_FOUND',
          message: 'Este producto ya no está disponible en el catálogo.',
        });
        return item;
      }

      if (!fromCatalog.available || (fromCatalog.stock ?? 1) <= 0) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'UNAVAILABLE',
          message: 'Producto sin disponibilidad actual.',
        });
      }

      if (fromCatalog.stock !== null && item.quantity > fromCatalog.stock) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'INSUFFICIENT_STOCK',
          message: `Stock disponible: ${fromCatalog.stock}. Ajusta la cantidad.`,
        });
      }

      if (fromCatalog.price !== item.product.price) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'PRICE_CHANGED',
          message: `Precio actualizado a ${fromCatalog.price.toFixed(2)} €.`,
        });
      }

      return {
        ...item,
        product: fromCatalog,
      };
    });

    cartStore.replaceItems(nextItems);
    validationIssues.value = issues;
    statusInfo.value =
      issues.length === 0
        ? 'Carrito verificado. Todo listo para confirmar.'
        : 'Detectamos cambios en tu carrito. Revisa los productos marcados.';
  } catch (error) {
    statusInfo.value = 'No pudimos validar ahora. Revisa tu conexión e intenta nuevamente.';
    notifyError((error as Error).message);
  } finally {
    isValidatingCatalog.value = false;
  }
};

const buildWhatsAppMessage = () => {
  const lines: string[] = [];
  lines.push('Hola, quiero confirmar este pedido:');
  lines.push('');
  lines.push('Productos:');
  cartStore.items.forEach((item) => {
    lines.push(
      `- ${item.product.name} x${item.quantity} (${getItemSubtotal(item.product.price, item.quantity)} €)`
    );
  });
  lines.push('');
  lines.push(`Total: ${formattedTotal.value} €`);
  lines.push(`Nombre: ${form.value.name.trim()}`);
  lines.push(`Teléfono: ${form.value.phonePrefix}${form.value.phone.replace(/\D/g, '')}`);
  lines.push(`Email: ${form.value.email.trim()}`);
  lines.push(`Fecha de entrega: ${new Date(form.value.deliveryDate).toLocaleDateString('es-ES')}`);
  if (form.value.note.trim()) {
    lines.push(`Nota: ${form.value.note.trim()}`);
  }
  lines.push('');
  lines.push('Quedo atento(a) para coordinar el pedido. Gracias.');
  return lines.join('\n');
};

const copyWhatsAppMessage = async () => {
  if (!whatsappMessage.value) return;
  try {
    await navigator.clipboard.writeText(whatsappMessage.value);
    notifySuccess('Mensaje copiado al portapapeles.');
  } catch {
    notifyError('No se pudo copiar el mensaje.');
  }
};

const openWhatsApp = (message: string) => {
  if (!envConfig.whatsapp.enabled) {
    notifyError('Integración con WhatsApp deshabilitada');
    return;
  }

  const sanitizedPhone = envConfig.whatsapp.phoneNumber.replace(/\D/g, '');
  if (!sanitizedPhone) {
    notifyError('No hay número de WhatsApp configurado');
    return;
  }

  const encodedText = encodeURIComponent(message);
  const webUrl = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`;
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  notifySuccess('Abriendo WhatsApp para coordinar el pedido...');

  if (!isMobile) {
    whatsappMessage.value = message;
    showWhatsAppWebHelper.value = true;
    return;
  }

  if (isIOS) {
    const deepLink = `whatsapp://send?phone=${sanitizedPhone}&text=${encodedText}`;
    window.location.href = deepLink;
    window.setTimeout(() => {
      window.location.href = webUrl;
    }, 800);
    return;
  }

  window.location.href = webUrl;
};

const submitOrder = async () => {
  if (!validateForm()) {
    return;
  }
  if (!canSubmit.value) {
    notifyError('Revisa los conflictos del carrito antes de continuar.');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload: CreateOrderPayload = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: `${form.value.phonePrefix}${form.value.phone.replace(/\D/g, '')}`,
      delivery_date: form.value.deliveryDate || 'No especificada',
      note: form.value.note.trim() || '',
      items: cartStore.items.map((item) => ({
        id_product: item.product.id_product,
        quantity: item.quantity,
      })),
    };

    await orderService.createPublicOrder(tenantSlug.value, payload);
    notifySuccess(`¡Orden creada exitosamente! Total: ${formattedTotal.value} €`);
    openWhatsApp(buildWhatsAppMessage());
    cartStore.clearCart();
  } catch (error) {
    notifyError('Error al crear la orden. Por favor intenta de nuevo.');
    if (envConfig.enableDebug) {
      console.error(error);
    }
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  cartStore.initializeForTenant(tenantSlug.value);
  void validateCartWithCatalog();
});
</script>

<template>
  <main class="checkout-page">
    <header class="checkout-page__header">
      <h1>Checkout</h1>
      <p>Completa tus datos para confirmar el pedido.</p>
      <RouterLink :to="cartRoute" class="checkout-page__back">Volver al carrito</RouterLink>
    </header>

    <p class="checkout-page__status" :class="{ 'has-conflicts': hasBlockingConflicts }">
      {{ statusInfo }}
    </p>

    <section class="checkout-layout">
      <form class="checkout-form" @submit.prevent="submitOrder">
        <div class="form-field">
          <label for="client-name">Nombre</label>
          <input
            id="client-name"
            v-model="form.name"
            name="name"
            type="text"
            required
            placeholder="María García"
          />
          <small v-if="errors.name">{{ errors.name }}</small>
        </div>

        <div class="form-field">
          <label for="client-email">Correo Electrónico</label>
          <input
            id="client-email"
            v-model="form.email"
            name="email"
            type="email"
            required
            placeholder="maria@ejemplo.com"
          />
          <small v-if="errors.email">{{ errors.email }}</small>
        </div>

        <div class="form-field">
          <label for="phone-prefix">Teléfono</label>
          <div class="phone-grid">
            <select id="phone-prefix" v-model="form.phonePrefix" name="phonePrefix" required>
              <option value="">Prefijo</option>
              <option v-for="prefix in PHONE_PREFIXES" :key="prefix" :value="prefix">
                {{ prefix }}
              </option>
            </select>
            <input
              id="client-phone"
              v-model="form.phone"
              name="phone"
              type="tel"
              required
              placeholder="123-4567"
            />
          </div>
          <small v-if="errors.phonePrefix">{{ errors.phonePrefix }}</small>
          <small v-else-if="errors.phone">{{ errors.phone }}</small>
        </div>

        <div class="form-field">
          <label for="delivery-date">Fecha de entrega</label>
          <input
            id="delivery-date"
            v-model="form.deliveryDate"
            name="deliveryDate"
            type="date"
            :min="minDeliveryDate"
            required
          />
          <small v-if="errors.deliveryDate">{{ errors.deliveryDate }}</small>
        </div>

        <div class="form-field">
          <label for="order-note">Nota (opcional)</label>
          <textarea
            id="order-note"
            v-model="form.note"
            name="note"
            rows="3"
            placeholder="Cualquier solicitud especial..."
          />
        </div>

        <div class="checkout-form__actions">
          <button type="submit" :disabled="!canSubmit">{{ submitButtonText }}</button>
          <button type="button" class="secondary" @click="copyWhatsAppMessage">
            Copiar mensaje al portapapeles
          </button>
        </div>
      </form>

      <aside class="checkout-summary">
        <h2>Resumen del pedido</h2>
        <p v-if="cartStore.items.length === 0">No hay artículos en el carrito</p>
        <ul v-else>
          <li v-for="item in cartStore.items" :key="item.product.id_product">
            <span>{{ item.product.name }} x{{ item.quantity }}</span>
            <strong>{{ getItemSubtotal(item.product.price, item.quantity) }} €</strong>
          </li>
        </ul>
        <div class="checkout-summary__total">
          <span>Total</span>
          <strong>{{ formattedTotal }} €</strong>
        </div>
      </aside>
    </section>

    <section v-if="validationIssues.length" class="checkout-issues">
      <h3>Revisión de carrito</h3>
      <ul>
        <li v-for="issue in validationIssues" :key="`${issue.type}-${issue.productId}`">
          <strong>{{ getIssueTypeLabel(issue.type) }}:</strong>
          {{ issue.productName }} - {{ issue.message }}
        </li>
      </ul>
    </section>

    <section v-if="showWhatsAppWebHelper" class="checkout-whatsapp-helper">
      <div class="checkout-whatsapp-helper__card">
        <h3>Enviar pedido por WhatsApp Web</h3>
        <ol>
          <li>Copia el mensaje del pedido.</li>
          <li>Abre WhatsApp Web.</li>
          <li>Busca el número de destino.</li>
          <li>Pega el mensaje y envíalo.</li>
        </ol>
        <div class="checkout-whatsapp-helper__actions">
          <button type="button" @click="copyWhatsAppMessage">Copiar mensaje</button>
          <button type="button" class="secondary" @click="showWhatsAppWebHelper = false">
            Cerrar
          </button>
        </div>
      </div>
    </section>

    <RouterLink :to="homeRoute" class="checkout-page__home-link">Seguir comprando</RouterLink>
  </main>
</template>

