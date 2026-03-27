export type ProductStatus = 'active' | 'inactive' | 'archived' | 'deleted';

export type Product = {
  id_product: number;
  tenant_id: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  stock: number | null;
  status: ProductStatus;
  image_urls: string[];
  thumbnail_url: string | null;
  created_on: string;
};

/** Body for `PUT /auth/products/{id}` — only general fields; thumbnail and images are handled by their dedicated endpoints. */
export type UpdateProductDetailsPayload = {
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  status: ProductStatus;
  available: boolean;
};

/** Order line as returned by `GET /auth/orders` (nested items in `OrderItems` or `order_items`). */
export type OrderItem = {
  id_order_item: number;
  id_order: number;
  id_product: number;
  name: string;
  unit_price: number;
  quantity: number;
};

/** Values returned by `GET` / stored in domain (see backend `OrderStatus`). */
export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'expired'
  | 'deleted';

/** Subset allowed in `PATCH /auth/orders/{id}` for `status` (server rejects others). */
export type OrderPatchableStatus = 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'deleted';

export type Order = {
  id_order: number;
  tenant_id: number;
  id_user: number | null;
  user_name: string | null;
  phone: string | null;
  status: OrderStatus;
  total_price: number;
  note: string | null;
  /** Maps link or other delivery address value returned by backend. */
  delivery_direction: string | null;
  created_on: string;
  delivery_date: string | null;
  paid: boolean;
  expires_at: string | null;
  order_items: OrderItem[];
};

/** Body for `PATCH /auth/orders/{id}` — fields optional (`omitempty` on server). */
export type UpdateAuthOrderPayload = {
  status?: OrderPatchableStatus;
  paid?: boolean;
  cancellation_reason?: string | null;
};

export type CreateOrderItemPayload = {
  id_product: number;
  quantity: number;
};

export type CreateOrderPayload = {
  name: string;
  email: string;
  phone: string;
  delivery_address?: string | null;
  delivery_date: string | null;
  note: string | null;
  items: CreateOrderItemPayload[];
};

export type TenantBranding = {
  logo_url: string | null;
  logo_width: number | null;
  logo_height: number | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
};

/** No branding data until the public GET succeeds, or if the API fails (do not invent colors on the client). */
export const EMPTY_TENANT_BRANDING: TenantBranding = {
  logo_url: null,
  logo_width: null,
  logo_height: null,
  primary_color: null,
  secondary_color: null,
  accent_color: null,
};

/** `GET /t/{tenant_slug}/tenant/branding` — envelope; `branding` maps to `TenantBranding` after parsing. */
export type TenantBrandingApiResponse = {
  tenant_id: number;
  tenant_slug: string;
  branding: TenantBranding;
};

/** `PATCH /auth/tenant/branding/colors` — partial body; at least one field required by server. */
export type UpdateTenantBrandingColorsPayload = {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
};

export type TenantBrandingColorsBlock = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
};

/** `PATCH /auth/tenant/branding/colors` — 200 response. */
export type UpdateTenantBrandingColorsResponse = {
  message: string;
  tenant_id: number;
  colors: TenantBrandingColorsBlock;
};

export type TenantSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export type TenantConfig = {
  slug: string;
  displayName: string;
  supportPhone: string | null;
  whatsapp: string | null;
  planCode: string;
  subscriptionStatus: TenantSubscriptionStatus;
  isActive: boolean;
  branding: TenantBranding;
};

export type AuthTokenResponse = {
  token: string;
};

/** POST /t/{tenant_slug}/auth/login — tenant comes from the path; body is only credentials. */
export type LoginRequestBody = {
  email: string;
  password: string;
};

export type ApiErrorResponse = {
  error: string;
  code?: string;
};

