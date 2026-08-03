/// <reference types="vite/client" />

import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    /** Admin topbar title. */
    title?: string;
    /** Show admin header search for this route. */
    showSearch?: boolean;
    searchPlaceholder?: string;
    /** Sidebar active section: settings covers hub + nested settings pages. */
    navKey?: 'orders' | 'products' | 'settings';
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
