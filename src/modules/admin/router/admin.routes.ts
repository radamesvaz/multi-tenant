import type { RouteLocation, RouteRecordRaw } from 'vue-router';
import { envConfig } from '../../../core/config';

export const adminRoutes: RouteRecordRaw[] = [
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
    path: '/admin/subscription-canceled',
    name: 'admin-subscription-canceled',
    component: () => import('../pages/AdminSubscriptionCanceledPage.vue'),
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
        meta: {
          requiresAuth: true,
          title: 'Órdenes',
          navKey: 'orders',
          showSearch: true,
          searchPlaceholder: 'Buscar por nombre o email del cliente',
        },
      },
      {
        path: 'products',
        name: 'admin-products',
        component: () => import('../pages/AdminProductsPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Productos',
          navKey: 'products',
          showSearch: true,
          searchPlaceholder: 'Al menos 2 letras (prefijo del nombre)',
        },
      },
      {
        path: 'products/new',
        name: 'admin-product-new',
        component: () => import('../pages/AdminProductFormPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Nuevo producto',
          navKey: 'products',
        },
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: () => import('../pages/AdminSettingsPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Configuración',
          navKey: 'settings',
          showSearch: true,
          searchPlaceholder: 'Buscar en configuración',
        },
      },
      {
        path: 'branding',
        name: 'admin-branding',
        component: () => import('../pages/AdminBrandingPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Personalización',
          navKey: 'settings',
        },
      },
      {
        path: 'invitations',
        name: 'admin-invitations',
        component: () => import('../pages/AdminInvitationsPage.vue'),
        meta: {
          requiresAuth: true,
          title: 'Invitar usuario',
          navKey: 'settings',
        },
      },
    ],
  },
];
