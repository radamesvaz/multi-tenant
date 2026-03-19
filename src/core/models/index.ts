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

export type OrderItem = {
  id_product: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type OrderStatus = 'pending' | 'confirmed' | 'canceled' | 'delivered' | 'paid';

export type Order = {
  id_order: number;
  tenant_id: number;
  id_user: number | null;
  status: OrderStatus;
  total_price: number;
  note: string | null;
  created_on: string;
  delivery_date: string | null;
  paid: boolean;
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

export type ApiErrorResponse = {
  error: string;
  code?: string;
};

