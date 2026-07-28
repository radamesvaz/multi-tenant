<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { envConfig } from '../../../core/config';
import { isSubscriptionCanceledResponse } from '../../../core/auth/subscriptionApi';
import { PUBLIC_STORE_UNAVAILABLE_MESSAGE } from '../../../core/auth/publicBrandingApi';
import { orderService, productService } from '../../../core/services';
import type { CreateOrderPayload } from '../../../core/models';
import { isPurchasable, isSoldOut } from '../../../core/utils';
import { BaseButton, BaseLink } from '../../../shared/components';
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
  deliveryDirection: '',
  deliveryDate: '',
  note: '',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const isValidatingCatalog = ref(false);
const validationIssues = ref<ValidationIssue[]>([]);
const showWhatsAppWebHelper = ref(false);
const whatsappMessage = ref('');
const whatsappWebUrl = ref('');
/** When false, submit uses today; date picker only shown if true. */
const scheduleForLater = ref(false);

const homeRoute = computed(() => `/t/${tenantSlug.value}`);

const toLocalIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Local calendar today as `YYYY-MM-DD`. */
const todayIsoDate = computed(() => toLocalIsoDate(new Date()));

/** Min for “otro día” picker: tomorrow (no max). */
const minScheduledDeliveryDate = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toLocalIsoDate(tomorrow);
});

const effectiveDeliveryDate = computed(() =>
  scheduleForLater.value ? form.value.deliveryDate.trim() : todayIsoDate.value
);

const todayDeliveryLabel = computed(() =>
  new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
);

const openScheduleForLater = () => {
  scheduleForLater.value = true;
  if (!form.value.deliveryDate || form.value.deliveryDate < minScheduledDeliveryDate.value) {
    form.value.deliveryDate = minScheduledDeliveryDate.value;
  }
  const next = { ...errors.value };
  delete next.deliveryDate;
  errors.value = next;
};

const useDeliveryToday = () => {
  scheduleForLater.value = false;
  form.value.deliveryDate = '';
  const next = { ...errors.value };
  delete next.deliveryDate;
  errors.value = next;
};

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
  return 'Realizar pedido';
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
  const trimmedDirection = form.value.deliveryDirection.trim();
  const deliveryDate = form.value.deliveryDate.trim();

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
  if (!trimmedDirection) {
    nextErrors.deliveryDirection = 'Por favor ingresa la dirección de entrega';
  }
  if (scheduleForLater.value) {
    if (!deliveryDate) {
      nextErrors.deliveryDate = 'Por favor selecciona la fecha de entrega';
    } else if (deliveryDate < minScheduledDeliveryDate.value) {
      nextErrors.deliveryDate = 'La fecha programada debe ser a partir de mañana';
    }
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

  try {
    const catalog = await productService.fetchAllTenantProducts(tenantSlug.value);
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

      if (!isPurchasable(fromCatalog)) {
        issues.push({
          productId: item.product.id_product,
          productName: fromCatalog.name,
          type: 'UNAVAILABLE',
          message: isSoldOut(fromCatalog)
            ? 'Producto agotado.'
            : 'Producto sin disponibilidad actual.',
        });
      } else if (fromCatalog.track_inventory && item.quantity > fromCatalog.stock) {
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
  } catch (error) {
    notifyError((error as Error).message);
  } finally {
    isValidatingCatalog.value = false;
  }
};

const buildWhatsAppMessage = (orderId: number) => {
  const lines: string[] = [];
  lines.push('Hola, quiero confirmar este pedido:');
  lines.push('');
  lines.push(`Pedido #${orderId}`);
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
  lines.push(`Dirección: ${form.value.deliveryDirection.trim()}`);
  lines.push(`Fecha de entrega: ${effectiveDeliveryDate.value}`);
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

const openGoogleMaps = () => {
  window.open('https://maps.google.com', '_blank', 'noopener,noreferrer');
};

const isMobileUserAgent = () =>
  /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

const buildWhatsAppWebUrl = (message: string) => {
  const sanitizedPhone = envConfig.whatsapp.phoneNumber.replace(/\D/g, '');
  if (!sanitizedPhone) return null;
  const encodedText = encodeURIComponent(message);
  return {
    sanitizedPhone,
    encodedText,
    webUrl: `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`,
  };
};

/** Open blank tab on the submit click (user gesture) so desktop is not blocked after await. */
const prepareDesktopWhatsAppTab = (): Window | null => {
  if (isMobileUserAgent()) return null;
  if (!envConfig.whatsapp.enabled) return null;
  if (!envConfig.whatsapp.phoneNumber.replace(/\D/g, '')) return null;
  return window.open('about:blank', '_blank');
};

const openWhatsAppInNewTab = () => {
  if (!whatsappWebUrl.value) return;
  window.open(whatsappWebUrl.value, '_blank', 'noopener,noreferrer');
};

const openWhatsApp = (message: string, preparedTab: Window | null = null) => {
  if (!envConfig.whatsapp.enabled) {
    preparedTab?.close();
    notifyError('Integración con WhatsApp deshabilitada');
    return;
  }

  const built = buildWhatsAppWebUrl(message);
  if (!built) {
    preparedTab?.close();
    notifyError('No hay número de WhatsApp configurado');
    return;
  }

  const { sanitizedPhone, encodedText, webUrl } = built;
  const isMobile = isMobileUserAgent();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  whatsappMessage.value = message;
  whatsappWebUrl.value = webUrl;
  notifySuccess('Abriendo WhatsApp para coordinar el pedido...');

  if (!isMobile) {
    if (preparedTab && !preparedTab.closed) {
      preparedTab.location.href = webUrl;
      return;
    }
    const opened = window.open(webUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      showWhatsAppWebHelper.value = true;
    }
    return;
  }

  preparedTab?.close();

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

  const preparedWhatsAppTab = prepareDesktopWhatsAppTab();
  isSubmitting.value = true;
  try {
    const payload: CreateOrderPayload = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: `${form.value.phonePrefix}${form.value.phone.replace(/\D/g, '')}`,
      delivery_direction: form.value.deliveryDirection.trim(),
      delivery_date: effectiveDeliveryDate.value,
      note: form.value.note.trim() || '',
      items: cartStore.items.map((item) => ({
        id_product: item.product.id_product,
        quantity: item.quantity,
      })),
    };

    const created = await orderService.createPublicOrder(tenantSlug.value, payload);
    notifySuccess(
      `¡Pedido #${created.id_order} creado exitosamente! Total: ${formattedTotal.value} €`
    );
    openWhatsApp(buildWhatsAppMessage(created.id_order), preparedWhatsAppTab);
    cartStore.clearCart();
  } catch (error) {
    preparedWhatsAppTab?.close();
    const status = (error as Error & { status?: number }).status;
    const message = (error as Error).message ?? '';
    const messageLower = message.toLowerCase();

    if (status != null && isSubscriptionCanceledResponse(status, message)) {
      notifyError(PUBLIC_STORE_UNAVAILABLE_MESSAGE);
    } else if (status === 404) {
      notifyError('Este producto ya no está disponible.');
      void validateCartWithCatalog();
    } else if (status === 409) {
      if (messageLower.includes('not enough') || messageLower.includes('stock')) {
        notifyError('No hay stock suficiente para uno o más productos.');
      } else {
        notifyError('Uno o más productos no están disponibles para compra.');
      }
      void validateCartWithCatalog();
    } else if (status === 400 && messageLower.includes('delivery_direction')) {
      notifyError('La dirección de entrega es obligatoria.');
      errors.value = {
        ...errors.value,
        deliveryDirection: 'Por favor ingresa la dirección de entrega',
      };
    } else if (status === 400 && messageLower.includes('delivery_date')) {
      notifyError('Revisa la fecha de entrega.');
      errors.value = {
        ...errors.value,
        deliveryDate: 'Por favor selecciona una fecha de entrega válida',
      };
    } else if (status === 400 && messageLower.includes('tenant')) {
      notifyError('No se pudo resolver la tienda. Recarga la página e intenta de nuevo.');
    } else {
      notifyError('Error al crear la orden. Por favor intenta de nuevo.');
    }

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
      <BaseLink :to="homeRoute" class="checkout-page__back">Volver</BaseLink>
      <h1>Checkout</h1>
      <p>Completa tus datos para confirmar el pedido.</p>
    </header>

    <section class="checkout-layout">
      <form id="checkout-form" class="checkout-form" @submit.prevent="submitOrder">
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
          <label for="delivery-direction">Dirección de entrega</label>
          <input
            id="delivery-direction"
            v-model="form.deliveryDirection"
            name="deliveryDirection"
            type="text"
            required
            placeholder="https://maps.google.com/?q=..."
          />
          <BaseButton
            unstyled
            type="button"
            class="checkout-location-button"
            @click="openGoogleMaps"
          >
            Abrir Google Maps
          </BaseButton>
          <small v-if="errors.deliveryDirection">{{ errors.deliveryDirection }}</small>
        </div>

        <div class="form-field">
          <span id="delivery-timing-label" class="form-field__label">Entrega</span>
          <div
            class="checkout-delivery-timing"
            role="group"
            aria-labelledby="delivery-timing-label"
          >
            <template v-if="!scheduleForLater">
              <p class="checkout-delivery-timing__today">
                Entrega para hoy
                <span class="checkout-delivery-timing__date">{{ todayDeliveryLabel }}</span>
              </p>
              <BaseButton
                unstyled
                type="button"
                class="checkout-location-button"
                @click="openScheduleForLater"
              >
                Programar para otro día
              </BaseButton>
            </template>
            <template v-else>
              <label for="delivery-date">Fecha programada</label>
              <input
                id="delivery-date"
                v-model="form.deliveryDate"
                name="deliveryDate"
                type="date"
                :min="minScheduledDeliveryDate"
                required
              />
              <BaseButton
                unstyled
                type="button"
                class="checkout-location-button"
                @click="useDeliveryToday"
              >
                Usar entrega para hoy
              </BaseButton>
            </template>
          </div>
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
        <div class="checkout-form__actions">
          <BaseButton
            unstyled
            type="submit"
            form="checkout-form"
            :disabled="!canSubmit"
          >
            {{ submitButtonText }}
          </BaseButton>
          <BaseButton
            unstyled
            type="button"
            class="secondary"
            @click="copyWhatsAppMessage"
          >
            Copiar mensaje al portapapeles
          </BaseButton>
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
        <h3>Abrir WhatsApp para tu pedido</h3>
        <p>
          El navegador bloqueó la ventana emergente. Podés abrir WhatsApp manualmente o
          copiar el mensaje.
        </p>
        <div class="checkout-whatsapp-helper__actions">
          <BaseButton unstyled type="button" @click="openWhatsAppInNewTab">
            Abrir WhatsApp
          </BaseButton>
          <BaseButton unstyled type="button" class="secondary" @click="copyWhatsAppMessage">
            Copiar mensaje
          </BaseButton>
          <BaseButton
            unstyled
            type="button"
            class="secondary"
            @click="showWhatsAppWebHelper = false"
          >
            Cerrar
          </BaseButton>
        </div>
      </div>
    </section>

    <BaseLink :to="homeRoute" class="checkout-page__home-link">Seguir comprando</BaseLink>
  </main>
</template>
