import { createRouter, createWebHistory } from 'vue-router';
import { SubscriptionCanceledError } from '../../core/auth/subscriptionApi';
import { envConfig } from '../../core/config';
import { useAuthStore, useSubscriptionStore } from '../../shared/store';
import { adminRoutes } from '../../modules/admin/router/admin.routes';

const routes = [
  {
    path: '/',
    redirect: `/t/${envConfig.defaultTenantSlug}`,
  },
  {
    path: '/t/:tenantSlug/auth/password/forgot',
    name: 'admin-password-forgot',
    component: () => import('../../modules/admin/pages/AdminForgotPasswordPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/t/:tenantSlug/auth/password/reset',
    name: 'admin-password-reset',
    component: () => import('../../modules/admin/pages/AdminResetPasswordPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/t/:tenantSlug/auth/invitations/accept',
    name: 'admin-invitation-accept',
    component: () => import('../../modules/admin/pages/AdminAcceptInvitationPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/tenant-register',
    name: 'tenant-register',
    component: () => import('../../modules/admin/pages/TenantRegisterPage.vue'),
    meta: { guestOnly: true },
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

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const subscriptionStore = useSubscriptionStore();

  const tenantSlugFromRoute =
    typeof to.params.tenantSlug === 'string' && to.params.tenantSlug.length > 0
      ? to.params.tenantSlug
      : null;

  /** `/admin/*` routes do not include tenant in path; use login-saved tenant context. */
  const tenantSlug = tenantSlugFromRoute ?? authStore.getActiveAdminTenantSlug();

  if (to.meta.guestOnly) {
    /**
     * `/tenant-register` has no tenant in the path. Allow unauthenticated visitors through
     * even if a previous admin tenant context exists in localStorage without a live session.
     */
    if (to.name === 'tenant-register') {
      const activeSlug = authStore.getActiveAdminTenantSlug();
      if (
        authStore.isAuthenticatedForTenant(activeSlug) &&
        authStore.isAdminForTenant(activeSlug)
      ) {
        return { name: 'admin-orders' };
      }
      return true;
    }

    if (!authStore.isAuthenticatedForTenant(tenantSlug)) {
      return true;
    }
    if (authStore.isAdminForTenant(tenantSlug)) {
      return { name: 'admin-orders', query: to.query };
    }
    return { name: 'admin-forbidden' };
  }

  if (to.name === 'admin-subscription-canceled') {
    return true;
  }

  if (!to.meta.requiresAuth) {
    return true;
  }

  /** `isAuthenticatedForTenant` clears token when JWT `exp` is expired. */
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

  if (subscriptionStore.isCanceled) {
    return {
      name: 'admin-subscription-canceled',
      query: { tenantSlug },
    };
  }

  const token = authStore.getToken(tenantSlug);
  if (token && !subscriptionStore.isLoaded && !subscriptionStore.isCanceled) {
    try {
      await subscriptionStore.hydrateFromToken(token);
    } catch (err) {
      if (err instanceof SubscriptionCanceledError) {
        return {
          name: 'admin-subscription-canceled',
          query: { tenantSlug },
        };
      }
      /* Non-fatal: admin panel stays usable; payment ribbon may be missing until refresh. */
    }
  }

  return true;
});

