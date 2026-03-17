import { envConfig } from '../config';
import type {
  ApiErrorResponse,
  AuthTokenResponse,
  CreateOrderPayload,
  Order,
  Product,
  TenantBranding,
} from '../models';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type HttpOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
};

async function httpRequest<TResponse>(path: string, options: HttpOptions = {}): Promise<TResponse> {
  const url = `${envConfig.apiBaseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const errorData = (await response.json()) as ApiErrorResponse;
      const error = new Error(errorData.error || 'Request failed');
      (error as Error & { code?: string }).code = errorData.code;
      throw error;
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  if (!isJson) {
    // @ts-expect-error allow non-JSON responses when caller expects void or similar
    return undefined;
  }

  return (await response.json()) as TResponse;
}

export const authService = {
  loginTenant(tenantSlug: string, email: string, password: string) {
    return httpRequest<AuthTokenResponse>(`/t/${tenantSlug}/auth/login`, {
      method: 'POST',
      body: { email, password },
    });
  },
};

export const tenantService = {
  getPublicBranding(tenantSlug: string) {
    return httpRequest<TenantBranding>(`/t/${tenantSlug}/branding`);
  },
};

export const productService = {
  getPublicProducts() {
    return httpRequest<Product[]>('/products');
  },
  getProductById(id: number) {
    return httpRequest<Product>(`/products/${id}`);
  },
};

export const orderService = {
  createPublicOrder(tenantSlug: string, payload: CreateOrderPayload) {
    return httpRequest<Order>(`/t/${tenantSlug}/orders`, {
      method: 'POST',
      body: payload,
    });
  },
};


