import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Rutas públicas base (se rellenarán más adelante)
  {
    path: '/t/:tenantSlug',
    name: 'public-home',
    component: () => import('../../modules/public/pages/PublicHomePage.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

