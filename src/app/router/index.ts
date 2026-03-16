import { createRouter, createWebHistory } from 'vue-router';
import { envConfig } from '../../core/config';
import { useAuthStore } from '../../shared/store';

const routes = [
  {
    path: '/',
    redirect: `/t/${envConfig.defaultTenantSlug}`,
  },
  {
    path: '/t/:tenantSlug',
    component: () => import('../../modules/public/components/PublicLayout.vue'),
    children: [
      {
        path: '',
        name: 'public-home',
        component: () => import('../../modules/public/pages/PublicHomePage.vue'),
      },
      {
        path: 'products/:id',
        name: 'public-product-detail',
        component: () => import('../../modules/public/pages/PublicProductDetailPage.vue'),
      },
      {
        path: 'cart',
        name: 'public-cart',
        component: () => import('../../modules/public/pages/PublicCartPage.vue'),
      },
      {
        path: 'checkout',
        name: 'public-checkout',
        component: () => import('../../modules/public/pages/PublicCheckoutPage.vue'),
      },
    ],
  },
  {
    path: '/t/:tenantSlug/admin',
    component: () => import('../../modules/admin/components/AdminLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'admin-login',
        component: () => import('../../modules/admin/pages/AdminLoginPage.vue'),
      },
      {
        path: 'products',
        name: 'admin-products',
        component: () => import('../../modules/admin/pages/AdminProductsListPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'products/new',
        name: 'admin-product-new',
        component: () => import('../../modules/admin/pages/AdminProductFormPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'products/:id',
        name: 'admin-product-edit',
        component: () => import('../../modules/admin/pages/AdminProductFormPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('../../modules/admin/pages/AdminOrdersListPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'orders/:id',
        name: 'admin-order-detail',
        component: () => import('../../modules/admin/pages/AdminOrderDetailPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'branding',
        name: 'admin-branding',
        component: () => import('../../modules/admin/pages/AdminBrandingPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: `/t/${envConfig.defaultTenantSlug}`,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) {
    return true;
  }

  const tenantSlugParam = to.params.tenantSlug;
  const tenantSlug = typeof tenantSlugParam === 'string' ? tenantSlugParam : '';
  const authStore = useAuthStore();

  if (!tenantSlug || !authStore.isAuthenticatedForTenant(tenantSlug)) {
    return {
      name: 'admin-login',
      params: { tenantSlug },
    };
  }

  return true;
});

