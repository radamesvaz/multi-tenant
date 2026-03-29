import { envConfig } from '../config';
import type {
  ApiErrorResponse,
  AuthTokenResponse,
  CreateOrderPayload,
  Order,
  OrderItem,
  Product,
  TenantBranding,
  TenantBrandingApiResponse,
  LoginRequestBody,
  UpdateAuthOrderPayload,
  UpdateProductDetailsPayload,
  UpdateTenantBrandingColorsPayload,
  UpdateTenantBrandingColorsResponse,
  PatchTenantBrandingLogoResponse,
} from '../models';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type HttpOptions = {
  method?: HttpMethod;
  body?: unknown;
  rawBody?: BodyInit;
  headers?: Record<string, string>;
  token?: string | null;
};

function tenantProductsBasePath(tenantSlug: string): string {
  return `/t/${encodeURIComponent(tenantSlug)}/products`;
}

/** `POST /t/{tenant_slug}/orders` — order creation from the public storefront. */
function tenantOrdersCreatePath(tenantSlug: string): string {
  return `/t/${encodeURIComponent(tenantSlug)}/orders`;
}

function authOrdersListPath(query?: { ignoreStatus?: boolean; status?: string }): string {
  const path = '/auth/orders';
  if (!query || (query.ignoreStatus !== true && !query.status)) {
    return path;
  }
  const params = new URLSearchParams();
  if (query.ignoreStatus === true) {
    params.set('ignore_status', 'true');
  }
  if (query.status) {
    params.set('status', query.status);
  }
  return `${path}?${params.toString()}`;
}

/** Normalizes backend response (`OrderItems` PascalCase -> `order_items`). */
function parseOrderItem(raw: unknown): OrderItem {
  const i = raw as Record<string, unknown>;
  return {
    id_order_item: Number(i.id_order_item),
    id_order: Number(i.id_order),
    id_product: Number(i.id_product),
    name: typeof i.name === 'string' ? i.name : '',
    unit_price: Number(i.unit_price),
    quantity: Number(i.quantity),
  };
}

/**
 * Maps API strings to backend `OrderStatus` values (`GET /auth/orders`).
 * Includes legacy spellings / old FE values where useful.
 */
function normalizeOrderStatus(raw: unknown): Order['status'] {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases: Record<string, Order['status']> = {
    pending: 'pending',
    preparing: 'preparing',
    ready: 'ready',
    delivered: 'delivered',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    cancel: 'cancelled',
    expired: 'expired',
    deleted: 'deleted',
    // legacy / alternate
    confirmed: 'preparing',
    paid: 'delivered',
    delivery: 'delivered',
  };

  if (aliases[key]) {
    return aliases[key];
  }

  const allowed: Order['status'][] = [
    'pending',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
    'expired',
    'deleted',
  ];
  if (allowed.includes(key as Order['status'])) {
    return key as Order['status'];
  }

  return 'pending';
}

/** `PATCH` may return `{ message: string }` instead of the full order. */
function patchResponseIsFullOrder(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (r.id_order == null || r.id_order === '') return false;
  return Number.isFinite(Number(r.id_order));
}

function parseOrder(raw: unknown): Order {
  const r = raw as Record<string, unknown>;
  const rawItems = r.OrderItems ?? r.order_items;
  const items = Array.isArray(rawItems) ? rawItems.map(parseOrderItem) : [];
  const idUser = r.id_user;
  return {
    id_order: Number(r.id_order),
    tenant_id: Number(r.tenant_id),
    id_user: idUser == null || idUser === '' ? null : Number(idUser),
    user_name: r.user_name == null ? null : String(r.user_name),
    phone: r.phone == null ? null : String(r.phone),
    status: normalizeOrderStatus(r.status),
    total_price: Number(r.total_price),
    note: r.note == null ? null : String(r.note),
    delivery_direction: r.delivery_direction == null ? null : String(r.delivery_direction),
    created_on: String(r.created_on ?? ''),
    delivery_date: r.delivery_date == null ? null : String(r.delivery_date),
    paid: Boolean(r.paid),
    expires_at: r.expires_at == null ? null : String(r.expires_at),
    order_items: items,
  };
}

async function httpRequest<TResponse>(path: string, options: HttpOptions = {}): Promise<TResponse> {
  const url = `${envConfig.apiBaseUrl}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  const isRawBody = options.rawBody !== undefined;
  if (!isRawBody && options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: isRawBody
      ? options.rawBody
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401 && options.token) {
      const { redirectOnUnauthorizedApi } = await import('../auth/redirectOnUnauthorized');
      await redirectOnUnauthorizedApi();
      const err = new Error('Session expired');
      (err as Error & { code?: string }).code = 'SESSION_EXPIRED';
      throw err;
    }

    const bodyText = await response.text();
    let message = bodyText.trim();
    let errorCode: string | undefined;

    if (message.startsWith('{')) {
      try {
        const parsed = JSON.parse(message) as ApiErrorResponse;
        if (typeof parsed.error === 'string' && parsed.error.length > 0) {
          message = parsed.error;
        }
        if (typeof parsed.code === 'string' && parsed.code.length > 0) {
          errorCode = parsed.code;
        }
      } catch {
        /* use plain text */
      }
    }
    if (!message) {
      message = `Request failed with status ${response.status}`;
    }
    const error = new Error(message);
    if (errorCode) {
      (error as Error & { code?: string }).code = errorCode;
    }
    throw error;
  }

  if (!isJson) {
    // @ts-expect-error allow non-JSON responses when caller expects void or similar
    return undefined;
  }

  return (await response.json()) as TResponse;
}

function parseTenantBrandingFields(raw: unknown): TenantBranding {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (k: string): string | null => {
    const v = b[k];
    if (v == null || v === '') return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };
  return {
    logo_url: str('logo_url'),
    primary_color: str('primary_color'),
    secondary_color: str('secondary_color'),
    accent_color: str('accent_color'),
  };
}

export const authService = {
  /**
   * Tenant login: `POST /t/{tenant_slug}/auth/login` — body is email + password only; tenant is taken from the path.
   */
  loginTenant(tenantSlug: string, body: LoginRequestBody) {
    return httpRequest<AuthTokenResponse>(`/t/${encodeURIComponent(tenantSlug)}/auth/login`, {
      method: 'POST',
      body,
    });
  },
};

export const tenantService = {
  /**
   * `GET /t/{tenant_slug}/tenant/branding` — public; returns normalized `TenantBranding`.
   */
  async getPublicBranding(tenantSlug: string): Promise<TenantBranding> {
    const raw = await httpRequest<TenantBrandingApiResponse>(
      `/t/${encodeURIComponent(tenantSlug)}/tenant/branding`,
      { method: 'GET' },
    );
    return parseTenantBrandingFields(raw.branding);
  },

  /** `PATCH /auth/tenant/branding/colors` — Bearer JWT; tenant from token context. */
  updateBrandingColors(token: string, payload: UpdateTenantBrandingColorsPayload) {
    return httpRequest<UpdateTenantBrandingColorsResponse>('/auth/tenant/branding/colors', {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  /**
   * `PATCH /auth/tenant/branding/logo` — `multipart/form-data`, field `logo`.
   * Do not set `Content-Type`; the browser sets the boundary.
   */
  patchTenantBrandingLogo(token: string, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return httpRequest<PatchTenantBrandingLogoResponse>('/auth/tenant/branding/logo', {
      method: 'PATCH',
      token,
      rawBody: formData,
    });
  },
};

export const productService = {
  /**
   * `GET /t/{tenant_slug}/products` — tenant catalog (optional JWT for admin routes).
   */
  listTenantProducts(tenantSlug: string, options: { token?: string | null } = {}) {
    return httpRequest<Product[]>(tenantProductsBasePath(tenantSlug), {
      method: 'GET',
      token: options.token ?? null,
    });
  },

  getPublicProducts(tenantSlug: string) {
    return this.listTenantProducts(tenantSlug);
  },

  getTenantProductById(tenantSlug: string, id: number, options: { token?: string | null } = {}) {
    return httpRequest<Product>(`${tenantProductsBasePath(tenantSlug)}/${id}`, {
      method: 'GET',
      token: options.token ?? null,
    });
  },

  getProductById(tenantSlug: string, id: number) {
    return this.getTenantProductById(tenantSlug, id);
  },

  async updateAuthProductDetails(token: string, id: number, payload: UpdateProductDetailsPayload) {
    return httpRequest<{ message: string }>(`/auth/products/${id}`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  async setAuthProductThumbnail(token: string, id: number, thumbnailUrl: string) {
    return httpRequest<{ message: string }>(`/auth/products/${id}/thumbnail`, {
      method: 'PATCH',
      token,
      body: { thumbnail_url: thumbnailUrl },
    });
  },

  async uploadAuthProductThumbnail(token: string, id: number, file: File) {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return httpRequest<{ message: string }>(`/auth/products/${id}/thumbnail`, {
      method: 'POST',
      token,
      rawBody: formData,
    });
  },

  async addAuthProductImages(token: string, id: number, files: File[]) {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    return httpRequest<{ message: string }>(`/auth/products/${id}/images`, {
      method: 'POST',
      token,
      rawBody: formData,
    });
  },

  async deleteAuthProductImage(token: string, id: number, imageUrl: string) {
    const params = new URLSearchParams({ imageUrl });
    return httpRequest<{ message: string }>(`/auth/products/${id}/images?${params.toString()}`, {
      method: 'DELETE',
      token,
    });
  },
};

export const orderService = {
  /**
   * `GET /auth/orders` — tenant orders from JWT context (no slug in URL).
   * Optional query: `ignore_status=true`, `status=<value>`.
   */
  async listAuthOrders(
    token: string,
    query?: { ignoreStatus?: boolean; status?: string },
  ) {
    const raw = await httpRequest<unknown>(authOrdersListPath(query), {
      method: 'GET',
      token,
    });
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(parseOrder);
  },

  /** `GET /auth/orders/{id}` — details; tenant resolved from JWT context. */
  async getAuthOrderById(token: string, id: number) {
    const raw = await httpRequest<unknown>(`/auth/orders/${id}`, {
      method: 'GET',
      token,
    });
    return parseOrder(raw);
  },

  /**
   * `PATCH /auth/orders/{id}` — `Authorization: Bearer`, `Content-Type: application/json`.
   * Body (optional fields): `status`, `paid`, `cancellation_reason`.
   */
  async updateAuthOrder(token: string, id: number, payload: UpdateAuthOrderPayload) {
    const raw = await httpRequest<unknown>(`/auth/orders/${id}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
    if (patchResponseIsFullOrder(raw)) {
      return parseOrder(raw);
    }
    return this.getAuthOrderById(token, id);
  },

  async createPublicOrder(tenantSlug: string, payload: CreateOrderPayload) {
    const raw = await httpRequest<unknown>(tenantOrdersCreatePath(tenantSlug), {
      method: 'POST',
      body: payload,
    });
    return parseOrder(raw);
  },
};


