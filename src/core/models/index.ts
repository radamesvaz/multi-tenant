export type ProductStatus = 'active' | 'inactive' | 'deleted';

export type Product = {
  id_product: number;
  tenant_id: number;
  name: string;
  description: string | null;
  price: number;
  track_inventory: boolean;
  stock: number;
  status: ProductStatus;
  image_urls: string[];
  thumbnail_url: string | null;
  created_on: string;
};

/** `GET /t/{tenant_slug}/products` — OpenAPI `ProductListResponse`. */
export type ProductListResponse = {
  items: Product[];
  next_cursor: string | null;
};

/** Body for `PUT /auth/products/{id}` — only general fields; thumbnail and images are handled by their dedicated endpoints. */
export type UpdateProductDetailsPayload = {
  name: string;
  description: string;
  price: number;
  stock: number;
  /** Omit to keep the current server value. */
  track_inventory?: boolean;
  /** Omit to keep the current server value. */
  status?: ProductStatus;
};

/** @deprecated Use `ProductStatus` — create accepts the same union. */
export type CreateProductStatus = ProductStatus;

/** Body for `POST /auth/products` — JSON only; images via separate endpoints. */
export type CreateProductPayload = {
  name: string;
  description: string;
  price: number;
  stock?: number;
  /** Omit or null on server → `true`. */
  track_inventory?: boolean;
  /** Omit → `"active"`. */
  status?: ProductStatus;
};

/** `POST /auth/products` — 201 Created response. */
export type CreateProductResponse = {
  message: string;
  product_id: number;
  image_urls: string[];
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

/** `GET /auth/orders` — cursor page (same shape as product lists). */
export type OrderListResponse = {
  items: Order[];
  next_cursor: string | null;
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

/** Body for `POST /t/{tenant_slug}/orders`. */
export type CreateOrderPayload = {
  name: string;
  email: string;
  phone: string;
  /** Required; Maps link or other delivery location value (same name as on order responses). */
  delivery_direction: string;
  /** Required; `YYYY-MM-DD`, calendar day ≥ today. */
  delivery_date: string;
  note: string | null;
  items: CreateOrderItemPayload[];
};

/** Success body for public create (201). */
export type CreateOrderResponse = {
  message: string;
  id_order: number;
};

export type TenantBranding = {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  /** Storefront invoice destination; `""` when unset (do not invent a number). */
  whatsapp_phone: string;
};

/** No branding data until the public GET succeeds, or if the API fails (do not invent colors on the client). */
export const EMPTY_TENANT_BRANDING: TenantBranding = {
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  whatsapp_phone: '',
};

/** `GET /t/{tenant_slug}/branding` — envelope; `branding` maps to `TenantBranding` after parsing. */
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

/** `PATCH /auth/branding/whatsapp` — always send `whatsapp_phone` (use `""` to clear). */
export type UpdateTenantBrandingWhatsappPayload = {
  whatsapp_phone: string;
};

/** `PATCH /auth/branding/whatsapp` — 200 response. */
export type UpdateTenantBrandingWhatsappResponse = {
  message: string;
  tenant_id: number;
  tenant_slug: string;
  whatsapp_phone: string;
};

/** `PATCH /auth/branding/logo` — multipart field `logo`; body shape may vary by backend. */
export type PatchTenantBrandingLogoResponse = {
  message?: string;
};

/** Mock / static tenant config only — not the shape returned by `GET /auth/subscription`. */
export type TenantSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

/** Values from `GET /auth/subscription` (admin panel). */
export type TenantSubscriptionApiStatus = 'active' | 'pending' | 'canceled';

export type SubscriptionContext = {
  status: TenantSubscriptionApiStatus;
  plan_code: string;
  current_period_end?: string;
  grace_period_end?: string;
  days_until_cancel?: number;
};

/** `GET /auth/subscription` — 200 response. */
export type SubscriptionResponse = {
  tenant_id: number;
  tenant_slug: string;
  subscription: SubscriptionContext;
};

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
  tenant_name?: string;
};

/** POST /t/{tenant_slug}/auth/login — tenant comes from the path; body is only credentials. */
export type LoginRequestBody = {
  email: string;
  password: string;
};

/** POST /t/{tenant_slug}/auth/password/forgot */
export type ForgotPasswordRequestBody = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

/** POST /t/{tenant_slug}/auth/password/reset */
export type ResetPasswordRequestBody = {
  token: string;
  new_password: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type ApiErrorResponse = {
  error: string;
  message?: string;
  code?: string;
};

/** POST /auth/invitations */
export type CreateInvitationRequestBody = {
  email: string;
};

/** POST /auth/invitations and POST /auth/invitations/{id}/resend — 201 Created */
export type InvitationMutationResponse = {
  id: number;
  email: string;
  expires_at: string;
  message: string;
};

/** POST /auth/invitations/{id}/revoke — 200 OK */
export type RevokeInvitationResponse = {
  message: string;
};

/** POST /t/{tenant_slug}/auth/invitations/accept */
export type AcceptInvitationRequestBody = {
  token: string;
  name: string;
  phone?: string;
  password: string;
};

/** POST /t/{tenant_slug}/auth/invitations/accept — 201 Created */
export type AcceptInvitationResponse = {
  message: string;
  token: string;
  email: string;
  user_id: number;
};

/** Stable `error` codes from invitation handlers — for UI branching and i18n keys. */
export const INVITATION_ERROR_CODES = {
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  TOO_MANY_REQUESTS: 'too_many_requests',
  EXPIRED_TOKEN: 'expired_token',
  TOKEN_ALREADY_CONSUMED: 'token_already_consumed',
  TOKEN_REVOKED: 'token_revoked',
  INVALID_TOKEN: 'invalid_token',
  WEAK_PASSWORD: 'weak_password',
  SERVICE_UNCONFIGURED: 'service_unconfigured',
} as const;

export type InvitationErrorCode =
  (typeof INVITATION_ERROR_CODES)[keyof typeof INVITATION_ERROR_CODES];

/** POST /public/tenant-register — slug is derived by the backend from `tenant_name`. */
export type TenantRegisterRequestBody = {
  tenant_name: string;
  admin_name: string;
  email: string;
  /** Admin user phone (optional). Not the store WhatsApp. */
  phone?: string;
  /** Tenant store WhatsApp for invoices (optional; max 20 after trim). */
  whatsapp_phone?: string;
  password: string;
  one_time_code: string;
};

/** POST /public/tenant-register — 201 Created */
export type TenantRegisterResponse = {
  message: string;
  token: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
  admin_id: number;
  admin_email: string;
};

