import type { RouteLocation } from 'vue-router';
import { envConfig } from '../../../core/config';

export const adminRoutes = [
  {
    path: '/admin/login',
    redirect: (to: RouteLocation) => ({
      path: `/${envConfig.defaultTenantSlug}/admin-login`,
      query: to.query,
    }),
  },
  {
    path: '/:tenantSlug/admin-login',
    name: 'admin-login',
    component: () => import('../pages/AdminLoginPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/admin/forbidden',
    name: 'admin-forbidden',
    component: () => import('../pages/AdminForbiddenPage.vue'),
  },
  {
    path: '/admin',
    component: () => import('../components/AdminLayout.vue'),
    children: [
      {
        path: '',
        redirect: { name: 'admin-orders' },
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('../pages/AdminOrdersPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'products',
        name: 'admin-products',
        component: () => import('../pages/AdminProductsPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
];
