export type ProductStatus = 'active' | 'inactive' | 'archived';

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

/** Order line as returned by `GET /auth/orders` (nested items in `OrderItems` or `order_items`). */
export type OrderItem = {
  id_order_item: number;
  id_order: number;
  id_product: number;
  name: string;
  unit_price: number;
  quantity: number;
};

export type OrderStatus = 'pending' | 'confirmed' | 'canceled' | 'delivered' | 'paid';

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

