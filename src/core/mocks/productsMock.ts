import type { Product } from '../models';

const nowIso = () => new Date().toISOString();

export const mockProducts: Product[] = [
  {
    id_product: 1,
    tenant_id: 1,
    name: 'Caja surtida de cupcakes',
    description: 'Caja de 12 cupcakes surtidos con buttercream de vainilla y chocolate.',
    price: 24.9,
    available: true,
    stock: 20,
    status: 'active',
    image_urls: [
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg',
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/45202/cupcakes-party-dessert-sweet-45202.jpeg',
    ],
    thumbnail_url: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=400',
    created_on: nowIso(),
  },
  {
    id_product: 2,
    tenant_id: 1,
    name: 'Torta de chocolate',
    description: 'Torta húmeda de chocolate con ganache y decoraciones de granja.',
    price: 32.5,
    available: true,
    stock: 8,
    status: 'active',
    image_urls: [
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg',
    ],
    thumbnail_url: 'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=400',
    created_on: nowIso(),
  },
  {
    id_product: 3,
    tenant_id: 1,
    name: 'Cookies decoradas',
    description: 'Docena de cookies decoradas a mano con glaseado de colores.',
    price: 18.0,
    available: true,
    stock: 50,
    status: 'active',
    image_urls: [
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1000',
      'https://images.pexels.com/photos/227432/pexels-photo-227432.jpeg',
    ],
    thumbnail_url: 'https://images.pexels.com/photos/227432/pexels-photo-227432.jpeg?auto=compress&cs=tinysrgb&w=400',
    created_on: nowIso(),
  },
];

export const getMockProductById = (id: number): Product | undefined => {
  return mockProducts.find((p) => p.id_product === id);
};

