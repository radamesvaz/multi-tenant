import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  // Base public routes (will be extended later)
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

