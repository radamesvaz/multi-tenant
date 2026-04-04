import type { Product } from '../../../core/models';

/** Demo catalog for the admin storefront preview only (not from API). */
export const STOREFRONT_PREVIEW_MOCK_PRODUCTS: Product[] = [
  {
    id_product: 9001,
    tenant_id: 0,
    name: 'Suspiros',
    description: 'Textura ligera y sabor tradicional.',
    price: 7,
    available: true,
    stock: 50,
    status: 'active',
    image_urls: [],
    thumbnail_url: 'https://placehold.co/320x320/e8f0ea/2a4d38?text=Suspiros',
    created_on: '',
  },
  {
    id_product: 9002,
    tenant_id: 0,
    name: 'Pan de molde',
    description: 'Ideal para el desayuno.',
    price: 4.5,
    available: true,
    stock: 30,
    status: 'active',
    image_urls: [],
    thumbnail_url: 'https://placehold.co/320x320/e8eef0/2d3840?text=Molde',
    created_on: '',
  },
  {
    id_product: 9003,
    tenant_id: 0,
    name: 'Croissant',
    description: 'Mantequilla y capas crujientes.',
    price: 2.2,
    available: true,
    stock: 40,
    status: 'active',
    image_urls: [],
    thumbnail_url: 'https://placehold.co/320x320/f5ebe0/5c4033?text=Croissant',
    created_on: '',
  },
];
