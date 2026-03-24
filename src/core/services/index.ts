import { envConfig } from '../config';
import type {
  ApiErrorResponse,
  AuthTokenResponse,
  CreateOrderPayload,
  Order,
  Product,
  TenantBranding,
  LoginRequestBody,
} from '../models';
import { mockProducts, getMockProductById } from '../mocks';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type HttpOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
};

async function httpRequest<TResponse>(path: string, options: HttpOptions = {}): Promise<TResponse> {
  // Temporary mock short-circuit: avoid real API calls for products while integrating backend.
  if (path === '/products' && (!options.method || options.method === 'GET')) {
    return Promise.resolve(mockProducts as unknown as TResponse);
  }

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
  getPublicBranding(tenantSlug: string) {
    return httpRequest<TenantBranding>(`/t/${tenantSlug}/branding`);
  },
};

export const productService = {
  getPublicProducts() {
    // TODO: replace with real HTTP call when backend integration is ready
    return Promise.resolve<Product[]>(mockProducts);
  },
  getProductById(id: number) {
    // TODO: replace with real HTTP call when backend integration is ready
    const product = getMockProductById(id);
    if (!product) {
      return Promise.reject(new Error('Product not found'));
    }
    return Promise.resolve<Product>(product);
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


