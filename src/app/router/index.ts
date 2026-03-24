import { createRouter, createWebHistory } from 'vue-router';
import { envConfig } from '../../core/config';
import { useAuthStore } from '../../shared/store';
import { adminRoutes } from '../../modules/admin/router/admin.routes';

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
  ...adminRoutes,
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
  const authStore = useAuthStore();

  const tenantSlugFromRoute =
    typeof to.params.tenantSlug === 'string' && to.params.tenantSlug.length > 0
      ? to.params.tenantSlug
      : null;

  /** `/admin/*` routes do not include tenant in path; use login-saved tenant context. */
  const tenantSlug = tenantSlugFromRoute ?? authStore.getActiveAdminTenantSlug();

  if (to.meta.guestOnly) {
    if (!authStore.isAuthenticatedForTenant(tenantSlug)) {
      return true;
    }
    if (authStore.isAdminForTenant(tenantSlug)) {
      return { name: 'admin-dashboard', query: to.query };
    }
    return { name: 'admin-forbidden' };
  }

  if (!to.meta.requiresAuth) {
    return true;
  }

  if (!authStore.isAuthenticatedForTenant(tenantSlug)) {
    return {
      name: 'admin-login',
      params: { tenantSlug: authStore.getActiveAdminTenantSlug() },
      query: { redirect: to.fullPath },
    };
  }

  if (!authStore.isAdminForTenant(tenantSlug)) {
    return { name: 'admin-forbidden' };
  }

  return true;
});

